// == External Ratings Fetcher ==
// Purpose: Fetches KP/IMDB ratings and provides them via callback. Handles caching.

(function(window) {
    'use strict';

    // --- Configuration ---
    var config = {
        kp_api_url: 'https://kinopoiskapiunofficial.tech/',
        kp_rating_url: 'https://rating.kinopoisk.ru/',
        kp_api_key: '2a4a0808-81a3-40ae-b0d3-e11335ede616',
        cache_time: 60 * 60 * 24 * 1000, // 1 day
        cache_key: 'external_ratings_cache', // Unique storage key
        cache_limit: 500, // Max items in cache
        request_timeout: 15000, // 15 seconds
        xml_timeout: 5000 // 5 seconds for faster XML endpoint
    };

    // --- Network Instance ---
    // Use Lampa.Reguest if available, otherwise basic fetch (requires polyfill potentially)
    var network = window.Lampa ? new Lampa.Reguest() : null; // Use Lampa's if possible

    // --- Helper Functions ---
    function cleanTitle(str) {
        return (str || '').replace(/[\s.,:;’'`!?]+/g, ' ').trim();
    }

    function kpCleanTitle(str) {
        return cleanTitle(str).replace(/^[ \/\\]+/, '').replace(/[ \/\\]+$/, '').replace(/\+( *[+\/\\])+/g, '+').replace(/([+\/\\] *)+\+/g, '+').replace(/( *[\/\\]+ *)+/g, '+');
    }

    function normalizeTitle(str) {
        return cleanTitle((str || '').toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-').replace(/ё/g, 'е'));
    }

    function equalTitle(t1, t2) {
        return typeof t1 === 'string' && typeof t2 === 'string' && normalizeTitle(t1) === normalizeTitle(t2);
    }

    function containsTitle(str, title) {
        return typeof str === 'string' && typeof title === 'string' && normalizeTitle(str).indexOf(normalizeTitle(title)) !== -1;
    }

    // --- Caching ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !window.Lampa.Storage) return false; // Cache requires Lampa
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache);
                return false;
            }
            return cache[tmdb_id]; // Return {kp: ..., imdb: ..., timestamp: ...}
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        if (!window.Lampa || !window.Lampa.Storage) return; // Cache requires Lampa
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        data.timestamp = timestamp;
        cache[tmdb_id] = data;
        Lampa.Storage.set(config.cache_key, cache);
    }

    // --- Core Fetching Logic ---
    function fetchRatings(movieData, callback) {
        // Ensure Lampa network is available
        if (!network) {
             console.error("ExternalRatingsFetcher: Lampa.Reguest not available.");
             if (callback) callback({ kp: 0, imdb: 0, error: "Network unavailable" });
             return;
        }
        // Basic validation of input
        if (!movieData || !movieData.id || !movieData.title || !callback) {
             console.error("ExternalRatingsFetcher: Invalid input data or missing callback.");
             if (callback) callback({ kp: 0, imdb: 0, error: "Invalid input" });
             return;
        }

        var tmdb_id = movieData.id;

        // 1. Check Cache
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) {
            // console.log("ExternalRatingsFetcher: Cache hit for", tmdb_id);
            callback(cached_ratings); // Use cached data
            return;
        }
        // console.log("ExternalRatingsFetcher: Cache miss for", tmdb_id);

        // 2. Prepare Search Parameters
        var clean_title = kpCleanTitle(movieData.title);
        var search_date = movieData.release_date || movieData.first_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));
        var orig_title = movieData.original_title || movieData.original_name;
        // Use imdb_id directly if provided in movieData (from TMDB append_to_response=external_ids)
        var imdb_id_from_tmdb = movieData.imdb_id;

        // Network request logic (nested functions similar to previous attempts)
        searchFilmOnKP();

        // --- Nested Functions for Fetching ---
        function searchFilmOnKP() {
            var base_url = config.kp_api_url;
            var headers = { 'X-API-KEY': config.kp_api_key };
            var url_by_title = Lampa.Utils.addUrlComponent(base_url + 'api/v2.1/films/search-by-keyword', 'keyword=' + encodeURIComponent(clean_title));
            var search_url;

            if (imdb_id_from_tmdb) {
                search_url = Lampa.Utils.addUrlComponent(base_url + 'api/v2.2/films', 'imdbId=' + encodeURIComponent(imdb_id_from_tmdb));
            } else {
                search_url = url_by_title;
            }

            // console.log("ExternalRatingsFetcher: Searching KP", search_url);
            network.clear(); // Use the fetcher's network instance
            network.timeout(config.request_timeout);
            network.silent(search_url, function (json) {
                var items = [];
                if (json.items && json.items.length) items = json.items;
                else if (json.films && json.films.length) items = json.films;

                if (!items.length && search_url !== url_by_title) {
                     // console.log("ExternalRatingsFetcher: Fallback to title search");
                     network.clear();
                     network.timeout(config.request_timeout);
                     network.silent(url_by_title, function (json_title) {
                        if (json_title.items && json_title.items.length) chooseFilmFromKP(json_title.items);
                        else if (json_title.films && json_title.films.length) chooseFilmFromKP(json_title.films);
                        else chooseFilmFromKP([]);
                     }, function (a, c) { handleFinalError("Title search failed"); }, false, { headers: headers });
                } else {
                    chooseFilmFromKP(items);
                }
            }, function (a, c) {
                if (search_url !== url_by_title) { // Error was on IMDB ID search, try title
                    // console.log("ExternalRatingsFetcher: Fallback to title search on error");
                    network.clear();
                    network.timeout(config.request_timeout);
                    network.silent(url_by_title, function (json_title) {
                        if (json_title.items && json_title.items.length) chooseFilmFromKP(json_title.items);
                        else if (json_title.films && json_title.films.length) chooseFilmFromKP(json_title.films);
                        else chooseFilmFromKP([]);
                    }, function(a_title, c_title){ handleFinalError("Title search fallback failed"); }, false, { headers: headers });
                } else { // Error was on title search
                    handleFinalError("Initial search failed");
                }
            }, false, { headers: headers });
        }

        function chooseFilmFromKP(items) {
            if (!items || !items.length) {
                return handleFinalError("No matches found");
            }
            var film_id_to_use = null;
            var matched_film = null;
             items.forEach(function (c) {
                var year = c.start_date || c.year || '0000';
                c.tmp_year = parseInt((year + '').slice(0, 4));
                c.kp_id_unified = c.kp_id || c.kinopoisk_id || c.kinopoiskId || c.filmId;
             });
             var filtered = items;
             if (imdb_id_from_tmdb) { /* Filter by IMDB ID */
                 var imdb_match = filtered.filter(function(item) { return (item.imdb_id || item.imdbId) === imdb_id_from_tmdb; });
                 if (imdb_match.length === 1) matched_film = imdb_match[0];
                 else if (imdb_match.length > 1) filtered = imdb_match;
             }
             if (!matched_film) { /* Filter by Title */
                var title_matches = filtered.filter(function(item) { return equalTitle(item.title || item.ru_title || item.nameRu, movieData.title) || equalTitle(item.orig_title || item.nameOriginal, orig_title) || equalTitle(item.en_title || item.nameEn, orig_title); });
                 if (title_matches.length > 0) filtered = title_matches;
                 else {
                     var contains_matches = filtered.filter(function(item) { return containsTitle(item.title || item.ru_title || item.nameRu, movieData.title) || containsTitle(item.orig_title || item.nameOriginal, orig_title) || containsTitle(item.en_title || item.nameEn, orig_title); });
                     if (contains_matches.length > 0) filtered = contains_matches;
                 }
             }
             if (!matched_film && filtered.length > 1 && search_year > 0) { /* Filter by Year */
                 var year_matches = filtered.filter(function(c) { return c.tmp_year === search_year; });
                 if (year_matches.length > 0) filtered = year_matches;
                 else {
                     var nearby_year_matches = filtered.filter(function(c) { return c.tmp_year && Math.abs(c.tmp_year - search_year) <= 1; });
                     if (nearby_year_matches.length > 0) filtered = nearby_year_matches;
                 }
             }
             /* Final Selection */
             if (matched_film) film_id_to_use = matched_film.kp_id_unified;
             else if (filtered.length === 1) film_id_to_use = filtered[0].kp_id_unified;
             else if (filtered.length > 1) film_id_to_use = filtered[0].kp_id_unified; // Take first if ambiguous

             if (film_id_to_use) fetchRatingsForKPID(film_id_to_use);
             else handleFinalError("Could not determine unique film ID");
        }

        function fetchRatingsForKPID(kp_id) {
            var xml_url = config.kp_rating_url + kp_id + '.xml';
            // console.log("ExternalRatingsFetcher: Trying XML", xml_url);
            network.clear();
            network.timeout(config.xml_timeout);
            network["native"](xml_url, function (xml_str) {
                var kp_rating = 0, imdb_rating = 0, found = false;
                try {
                    if (xml_str && xml_str.indexOf('<rating>') !== -1) {
                        const kpMatch = xml_str.match(/<kp_rating[^>]*>([\d.]+)<\/kp_rating>/);
                        const imdbMatch = xml_str.match(/<imdb_rating[^>]*>([\d.]+)<\/imdb_rating>/);
                        if (kpMatch && kpMatch[1]) { kp_rating = parseFloat(kpMatch[1]) || 0; found = true; }
                        if (imdbMatch && imdbMatch[1]) { imdb_rating = parseFloat(imdbMatch[1]) || 0; found = true; }
                    }
                } catch (e) { /* console.log("XML parse error", e) */ }

                if (found) {
                    // console.log("ExternalRatingsFetcher: Found in XML - KP:", kp_rating, "IMDB:", imdb_rating);
                    handleFinalSuccess({ kp: kp_rating, imdb: imdb_rating });
                } else {
                     // console.log("ExternalRatingsFetcher: Not in XML, trying API v2.2");
                     fetchRatingsFromApiV22(kp_id);
                }
            }, function (a, c) { // Error on XML
                 // console.log("ExternalRatingsFetcher: XML Error, trying API v2.2");
                 fetchRatingsFromApiV22(kp_id);
            }, false, { dataType: 'text' });
        }

        function fetchRatingsFromApiV22(kp_id) {
            var api_v22_url = config.kp_api_url + 'api/v2.2/films/' + kp_id;
            var headers = { 'X-API-KEY': config.kp_api_key };
            // console.log("ExternalRatingsFetcher: Trying API v2.2", api_v22_url);
            network.clear();
            network.timeout(config.request_timeout);
            network.silent(api_v22_url, function (data) {
                 // console.log("ExternalRatingsFetcher: Success API v2.2");
                 handleFinalSuccess({
                    kp: data.ratingKinopoisk || 0,
                    imdb: data.ratingImdb || 0
                 });
            }, function (a, c) {
                 handleFinalError("API v2.2 fetch failed");
            }, false, { headers: headers });
        }

        function handleFinalSuccess(ratings) {
            setCache(tmdb_id, ratings); // Cache successful result
            callback(ratings); // Send to original caller
        }

        function handleFinalError(errorMessage) {
            // console.log("ExternalRatingsFetcher:", errorMessage, "for ID:", tmdb_id);
            var emptyRatings = { kp: 0, imdb: 0, error: errorMessage };
            setCache(tmdb_id, emptyRatings); // Cache failure state to avoid retrying too soon
            callback(emptyRatings);
        }
        // --- End of Nested Functions ---
    }

    // Expose the fetchRatings function globally or via a namespace
    window.ExternalRatingsFetcher = {
        fetch: fetchRatings
    };

})(window); // Pass the window object
