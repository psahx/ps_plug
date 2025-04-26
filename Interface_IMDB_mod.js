(function () {
    'use strict';

    // --- Helper functions from second script (can be placed here or inside 'create') ---
    function cleanTitle(str){
        return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim();
    }

    function kpCleanTitle(str){
        // Make sure it handles potential undefined/null input gracefully
        return cleanTitle(str || '').replace(/^[ \/\\]+/, '').replace(/[ \/\\]+$/, '').replace(/\+( *[+\/\\])+/g, '+').replace(/([+\/\\] *)+\+/g, '+').replace(/( *[\/\\]+ *)+/g, '+');
    }

    function normalizeTitle(str){
         // Make sure it handles potential undefined/null input gracefully
        return cleanTitle((str || '').toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-').replace(/ё/g, 'е'));
    }

    function equalTitle(t1, t2){
        return typeof t1 === 'string' && typeof t2 === 'string' && normalizeTitle(t1) === normalizeTitle(t2);
    }

    function containsTitle(str, title){
        return typeof str === 'string' && typeof title === 'string' && normalizeTitle(str).indexOf(normalizeTitle(title)) !== -1;
    }
    // --- End Helper functions ---


    function create() { // Renamed 'create' class/function inside the IIFE
        var info_html; // Renamed 'html' to avoid conflict with component's html
        var info_timer; // Renamed 'timer'
        var info_network = new Lampa.Reguest(); // Renamed 'network'
        var info_loaded = {}; // Renamed 'loaded'
        var rating_network = new Lampa.Reguest(); // Separate network instance for ratings

        // --- Rating Cache functions (adapted from second script) ---
        var rating_params = {
            kp_api_url: 'https://kinopoiskapiunofficial.tech/', // Base API URL
            kp_rating_url: 'https://rating.kinopoisk.ru/',     // XML Rating URL
            kp_api_key: '2a4a0808-81a3-40ae-b0d3-e11335ede616', // API Key
            cache_time: 60 * 60 * 24 * 1000 // 1 day cache
        };

        function _getRatingCache(tmdb_id) {
            var timestamp = new Date().getTime();
            // Use tmdb_id as the key for caching
            var cache = Lampa.Storage.cache('kp_imdb_ratings', 500, {});
            if (cache[tmdb_id]) {
                if ((timestamp - cache[tmdb_id].timestamp) > rating_params.cache_time) {
                    delete cache[tmdb_id];
                    Lampa.Storage.set('kp_imdb_ratings', cache);
                    return false;
                }
                return cache[tmdb_id]; // Return the cached data {kp: ..., imdb: ..., timestamp: ...}
            }
            return false;
        }

        function _setRatingCache(tmdb_id, data) {
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache('kp_imdb_ratings', 500, {});
            data.timestamp = timestamp; // Add timestamp to the data being saved
            cache[tmdb_id] = data;
            Lampa.Storage.set('kp_imdb_ratings', cache);
            return data;
        }
        // --- End Rating Cache functions ---


        // --- Rating Fetching Logic (adapted from second script) ---
        this.loadExternalRatings = function(movie_data) {
            var _this_info = this; // Reference to the 'info' instance
            var tmdb_id = movie_data.id;

            // 1. Check Cache
            var cached_ratings = _getRatingCache(tmdb_id);
            if (cached_ratings) {
                // console.log("KP/IMDB: Ratings from cache for ID", tmdb_id);
                this._updateRatingsUI(cached_ratings);
                return; // Exit if we have fresh cached data
            }

            // 2. Prepare Search Parameters
            var clean_title = kpCleanTitle(movie_data.title);
            var search_date = movie_data.release_date || movie_data.first_air_date || '0000';
            var search_year = parseInt((search_date + '').slice(0, 4));
            var orig_title = movie_data.original_title || movie_data.original_name;
            var imdb_id_from_tmdb = movie_data.imdb_id; // Get imdb_id from the detailed data

            // console.log("KP/IMDB: Fetching for:", clean_title, search_year, imdb_id_from_tmdb);
            this._updateRatingsUI(null); // Show loading state

            // 3. Define Search Function
            function searchFilmOnKP() {
                var base_url = rating_params.kp_api_url;
                var headers = { 'X-API-KEY': rating_params.kp_api_key };
                var url_by_title = Lampa.Utils.addUrlComponent(base_url + 'api/v2.1/films/search-by-keyword', 'keyword=' + encodeURIComponent(clean_title));
                var search_url;

                if (imdb_id_from_tmdb) {
                    // Prioritize search by IMDB ID if available from TMDB details
                    search_url = Lampa.Utils.addUrlComponent(base_url + 'api/v2.2/films', 'imdbId=' + encodeURIComponent(imdb_id_from_tmdb));
                     // console.log("KP/IMDB: Searching by IMDB ID:", search_url);
                } else {
                    search_url = url_by_title;
                    // console.log("KP/IMDB: Searching by Title:", search_url);
                }

                rating_network.clear();
                rating_network.timeout(15000);
                rating_network.silent(search_url, function (json) {
                    var items = [];
                    if (json.items && json.items.length) items = json.items; // v2.1 search format
                    else if (json.films && json.films.length) items = json.films; // v2.2 search format or direct film result

                    // If IMDB search yielded no results or was not used, try title search as fallback
                    if (!items.length && search_url !== url_by_title) {
                        // console.log("KP/IMDB: IMDB ID search failed, falling back to title search:", url_by_title);
                        rating_network.clear();
                        rating_network.timeout(15000);
                        rating_network.silent(url_by_title, function (json_title) {
                            if (json_title.items && json_title.items.length) chooseFilmFromKP(json_title.items);
                            else if (json_title.films && json_title.films.length) chooseFilmFromKP(json_title.films);
                            else chooseFilmFromKP([]); // No results from title search either
                        }, function (a, c) {
                             // console.log("KP/IMDB: Title search error", rating_network.errorDecode(a, c));
                            _this_info._updateRatingsUI({ kp: 0, imdb: 0 }); // Show 0 on error
                            _setRatingCache(tmdb_id, { kp: 0, imdb: 0 }); // Cache empty result on error
                        }, false, { headers: headers });
                    } else {
                        chooseFilmFromKP(items); // Process results from initial search
                    }
                }, function (a, c) {
                    // Error on initial search (could be IMDB or Title)
                    if (search_url !== url_by_title) {
                        // If initial search was IMDB ID, try title search as fallback on error too
                       // console.log("KP/IMDB: IMDB ID search error, falling back to title search:", url_by_title);
                        rating_network.clear();
                        rating_network.timeout(15000);
                        rating_network.silent(url_by_title, function (json_title) {
                            if (json_title.items && json_title.items.length) chooseFilmFromKP(json_title.items);
                            else if (json_title.films && json_title.films.length) chooseFilmFromKP(json_title.films);
                            else chooseFilmFromKP([]);
                        }, function (a_title, c_title) {
                           // console.log("KP/IMDB: Title search error after IMDB error", rating_network.errorDecode(a_title, c_title));
                           _this_info._updateRatingsUI({ kp: 0, imdb: 0 });
                           _setRatingCache(tmdb_id, { kp: 0, imdb: 0 });
                        }, false, { headers: headers });
                    } else {
                        // Error occurred on title search (was the primary search)
                       // console.log("KP/IMDB: Title search error", rating_network.errorDecode(a, c));
                        _this_info._updateRatingsUI({ kp: 0, imdb: 0 });
                        _setRatingCache(tmdb_id, { kp: 0, imdb: 0 });
                    }
                }, false, { headers: headers });
            }

            // 4. Define Film Choosing Logic
            function chooseFilmFromKP(items) {
                // console.log("KP/IMDB: chooseFilmFromKP received items:", items.length);
                if (!items || !items.length) {
                    // console.log("KP/IMDB: No potential matches found.");
                    _this_info._updateRatingsUI({ kp: 0, imdb: 0 });
                    _setRatingCache(tmdb_id, { kp: 0, imdb: 0 }); // Cache empty result
                    return;
                }

                var film_id_to_use = null;
                var matched_film = null;

                // Add year property for comparison
                 items.forEach(function (c) {
                    var year = c.start_date || c.year || '0000';
                    c.tmp_year = parseInt((year + '').slice(0, 4));
                    // Standardize KP ID field
                    c.kp_id_unified = c.kp_id || c.kinopoisk_id || c.kinopoiskId || c.filmId;
                });


                // --- Matching Logic (similar to original script, simplified slightly) ---

                var filtered = items;

                // A. Filter by IMDB ID if provided and available in results
                 if (imdb_id_from_tmdb) {
                    var imdb_match = filtered.filter(function(item) {
                        return (item.imdb_id || item.imdbId) === imdb_id_from_tmdb;
                    });
                    if (imdb_match.length === 1) {
                        // console.log("KP/IMDB: Found single exact match by IMDB ID");
                        matched_film = imdb_match[0];
                    } else if (imdb_match.length > 1) {
                        // console.log("KP/IMDB: Found multiple matches by IMDB ID, proceed with other filters");
                        filtered = imdb_match; // Reduce pool to those matching IMDB ID
                    }
                    // If imdb_match.length is 0, continue with the original 'filtered' list
                }


                // B. Filter by Exact Title / Original Title (if no single IMDB match yet)
                if (!matched_film) {
                    var title_matches = filtered.filter(function(item) {
                        return equalTitle(item.title || item.ru_title || item.nameRu, movie_data.title) ||
                               equalTitle(item.orig_title || item.nameOriginal, orig_title) ||
                               equalTitle(item.en_title || item.nameEn, orig_title); // Compare en_title too
                    });

                    if (title_matches.length > 0) {
                        // console.log("KP/IMDB: Found", title_matches.length, "exact title matches");
                        filtered = title_matches; // Reduce pool further
                    } else {
                         // console.log("KP/IMDB: No exact title matches, trying contains...");
                         // C. Filter by Containing Title (if no exact title matches)
                         var contains_matches = filtered.filter(function(item) {
                             return containsTitle(item.title || item.ru_title || item.nameRu, movie_data.title) ||
                                    containsTitle(item.orig_title || item.nameOriginal, orig_title) ||
                                    containsTitle(item.en_title || item.nameEn, orig_title);
                         });
                          if (contains_matches.length > 0) {
                            // console.log("KP/IMDB: Found", contains_matches.length, "containing title matches");
                            filtered = contains_matches; // Reduce pool further
                         }
                    }
                }


                 // D. Filter by Year (if no single IMDB match yet and multiple candidates remain)
                 if (!matched_film && filtered.length > 1 && search_year > 0) {
                     // console.log("KP/IMDB: Filtering", filtered.length,"candidates by year:", search_year);
                     var year_matches = filtered.filter(function(item) {
                         return item.tmp_year === search_year;
                     });

                     if (year_matches.length > 0) {
                         // console.log("KP/IMDB: Found", year_matches.length, "matches for exact year");
                         filtered = year_matches;
                     } else {
                         // console.log("KP/IMDB: No exact year match, trying +/- 1 year");
                         // Allow +/- 1 year difference if no exact match
                         var nearby_year_matches = filtered.filter(function(item) {
                             return item.tmp_year && Math.abs(item.tmp_year - search_year) <= 1;
                         });
                         if (nearby_year_matches.length > 0) {
                             // console.log("KP/IMDB: Found", nearby_year_matches.length, "matches for nearby year");
                             filtered = nearby_year_matches;
                         }
                     }
                 }


                // --- Final Selection ---
                if (matched_film) {
                    // Use the film already matched by IMDB ID
                    film_id_to_use = matched_film.kp_id_unified;
                    // console.log("KP/IMDB: Using film matched by IMDB ID:", film_id_to_use);
                } else if (filtered.length === 1) {
                    // If after all filters, only one candidate remains
                    film_id_to_use = filtered[0].kp_id_unified;
                    // console.log("KP/IMDB: Found single candidate after filtering:", film_id_to_use);
                } else if (filtered.length > 1) {
                    // If multiple candidates remain, maybe pick the first one? Or log ambiguity?
                    // Original script implicitly took the first one if is_sure wasn't met.
                    film_id_to_use = filtered[0].kp_id_unified; // Taking the first result
                    // console.log("KP/IMDB: Multiple candidates remain after filtering, taking first one:", film_id_to_use);
                }

                // 5. Fetch Ratings for Selected Film ID
                if (film_id_to_use) {
                    fetchRatingsForKPID(film_id_to_use);
                } else {
                    // console.log("KP/IMDB: Could not determine a unique film ID.");
                    _this_info._updateRatingsUI({ kp: 0, imdb: 0 });
                    _setRatingCache(tmdb_id, { kp: 0, imdb: 0 }); // Cache empty result
                }
            }

            // 6. Define Rating Fetching by KP ID
            function fetchRatingsForKPID(kp_id) {
                // console.log("KP/IMDB: Fetching ratings for KP ID:", kp_id);
                var headers = { 'X-API-KEY': rating_params.kp_api_key };

                // Try fetching from the faster XML endpoint first
                var xml_url = rating_params.kp_rating_url + kp_id + '.xml';
                // console.log("KP/IMDB: Trying XML endpoint:", xml_url);
                rating_network.clear();
                rating_network.timeout(5000);
                rating_network["native"](xml_url, function (xml_str) { // Use native request for text
                    // console.log("KP/IMDB: XML response received");
                    var kp_rating = 0;
                    var imdb_rating = 0;
                    var found_in_xml = false;
                    try {
                        if (xml_str && xml_str.indexOf('<rating>') !== -1) {
                             // Basic parsing to avoid jQuery dependency if possible
                             const kpMatch = xml_str.match(/<kp_rating[^>]*>([\d.]+)<\/kp_rating>/);
                             const imdbMatch = xml_str.match(/<imdb_rating[^>]*>([\d.]+)<\/imdb_rating>/);

                             if (kpMatch && kpMatch[1]) {
                                 kp_rating = parseFloat(kpMatch[1]) || 0;
                                 found_in_xml = true;
                             }
                             if (imdbMatch && imdbMatch[1]) {
                                 imdb_rating = parseFloat(imdbMatch[1]) || 0;
                                 found_in_xml = true;
                             }
                        }
                    } catch (e) {
                       // console.log("KP/IMDB: Error parsing XML:", e);
                    }

                    if (found_in_xml) {
                        // console.log("KP/IMDB: Ratings found in XML - KP:", kp_rating, "IMDB:", imdb_rating);
                        var ratings_data = { kp: kp_rating, imdb: imdb_rating };
                        _this_info._updateRatingsUI(ratings_data);
                        _setRatingCache(tmdb_id, ratings_data); // Cache result
                    } else {
                         // console.log("KP/IMDB: Ratings not found in XML, falling back to API v2.2");
                         fetchRatingsFromApiV22(kp_id); // Fallback to main API
                    }

                }, function (a, c) { // Error loading XML
                    // console.log("KP/IMDB: XML endpoint error, falling back to API v2.2:", rating_network.errorDecode(a,c));
                    fetchRatingsFromApiV22(kp_id); // Fallback to main API
                }, false, { dataType: 'text' }); // Specify dataType as text for native request
            }

            // 7. Define Fallback Rating Fetching from API v2.2
            function fetchRatingsFromApiV22(kp_id) {
                var api_v22_url = rating_params.kp_api_url + 'api/v2.2/films/' + kp_id;
                var headers = { 'X-API-KEY': rating_params.kp_api_key };
                 // console.log("KP/IMDB: Fetching from API v2.2:", api_v22_url);

                rating_network.clear();
                rating_network.timeout(15000);
                rating_network.silent(api_v22_url, function (data) {
                    // console.log("KP/IMDB: API v2.2 response:", data);
                    var kp_rating = data.ratingKinopoisk || 0;
                    var imdb_rating = data.ratingImdb || 0;
                    var ratings_data = { kp: kp_rating, imdb: imdb_rating };

                    _this_info._updateRatingsUI(ratings_data);
                    _setRatingCache(tmdb_id, ratings_data); // Cache result
                }, function (a, c) { // Error fetching from API v2.2
                    // console.log("KP/IMDB: API v2.2 fetch error:", rating_network.errorDecode(a,c));
                    _this_info._updateRatingsUI({ kp: 0, imdb: 0 });
                    _setRatingCache(tmdb_id, { kp: 0, imdb: 0 }); // Cache empty result on error
                }, false, { headers: headers });
            }

            // Start the process
            searchFilmOnKP();

        }; // --- End loadExternalRatings ---


         // --- UI Update function ---
        this._updateRatingsUI = function(ratings) {
            // Ensure html element exists
            if (!info_html) return;

            var kp_div = info_html.find('.rate--kp');
            var imdb_div = info_html.find('.rate--imdb');

            // Clear previous state and remove potential 'loading' class
            kp_div.removeClass('loading').empty().show(); // Make sure they are visible initially before potentially hiding
            imdb_div.removeClass('loading').empty().show(); // Make sure they are visible initially before potentially hiding


            if (ratings === null) {
                // Loading state - show spinners or placeholders
                // console.log("KP/IMDB: Setting loading state in UI");
                 kp_div.addClass('loading').html('...'); // Or add spinner HTML
                 imdb_div.addClass('loading').html('...'); // Or add spinner HTML
            } else {
                 // console.log("KP/IMDB: Updating UI with ratings:", ratings);
                 var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '-';
                 var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '-';

                 // Only display if rating is valid (greater than 0)
                 if (kp_rating_str !== '-' && parseFloat(kp_rating_str) > 0) {
                     kp_div.append('<div>' + kp_rating_str + '</div><div>KP</div>');
                 } else {
                     kp_div.hide(); // Hide if no valid rating
                 }
                 if (imdb_rating_str !== '-' && parseFloat(imdb_rating_str) > 0) {
                     imdb_div.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>');
                 } else {
                     imdb_div.hide(); // Hide if no valid rating
                 }

                 // Ensure the parent container re-evaluates visibility if all ratings are hidden
                 var details_container = info_html.find('.new-interface-info__details');
                 if(details_container.find('.full-start__rate:visible, .rate--kp:visible, .rate--imdb:visible').length === 0) {
                    // Maybe hide the whole rating section or adjust spacing if needed
                 } else {
                    // Ensure splitters are correctly placed between visible ratings
                    details_container.find('.rating-splitter').remove(); // Clear old splitters
                    var visible_ratings = details_container.find('.full-start__rate:visible, .rate--kp:visible, .rate--imdb:visible');
                    visible_ratings.each(function(index) {
                        if (index < visible_ratings.length - 1) {
                            // Insert splitter only between visible elements
                            $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>');
                        }
                    });
                 }
            }
        };
        // --- End UI Update function ---

        this.create = function () {
            // Added divs for KP and IMDB ratings with specific classes
            info_html = $("<div class=\"new-interface-info\">\n                <div class=\"new-interface-info__body\">\n                    <div class=\"new-interface-info__head\"></div>\n                    <div class=\"new-interface-info__title\"></div>\n                    <div class=\"new-interface-info__details\">\n                        \n                    </div>\n                    <div class=\"new-interface-info__description\"></div>\n                </div>\n            </div>");
        };

        this.update = function (data) {
            // Make sure data is valid before proceeding
            if (!data || typeof data !== 'object') {
                 console.log("Info Update Error: Invalid data received.", data);
                 // Optionally clear the panel or show an error state
                 info_html.find('.new-interface-info__head,.new-interface-info__details,.new-interface-info__title,.new-interface-info__description').empty();
                 return;
            }

            info_html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---'); // Clear and set loading text
            info_html.find('.new-interface-info__title').text(data.title || ''); // Use fallback for title
            info_html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            // Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200')); // Maybe use higher res? w1280 used elsewhere
            this.load(data); // Proceed to load detailed data
        };


        this.draw = function (movie) { // 'movie' here is the detailed data from TMDB
            // Ensure movie data is valid
             if (!movie || typeof movie !== 'object') {
                 console.log("Info Draw Error: Invalid movie data received.", movie);
                 // Optionally keep the loading state or show an error
                 info_html.find('.new-interface-info__details').text('Error loading details.');
                 return;
             }

            var create_year = ((movie.release_date || movie.first_air_date || '0000') + '').slice(0, 4);
            var vote_tmdb = parseFloat((movie.vote_average || 0) + '').toFixed(1);
            var head = [];
            var details_nodes = []; // Use an array of jQuery nodes or HTML strings
            var countries = Lampa.Api.sources.tmdb.parseCountries(movie);
            var pg = Lampa.Api.sources.tmdb.parsePG(movie);

            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // 1. Add TMDB Rating (if valid)
            if (vote_tmdb > 0) {
                // Make sure the div is visible initially
                details_nodes.push('<div class="full-start__rate" style="display: inline-flex;"><div>' + vote_tmdb + '</div><div>TMDB</div></div>');
            }

            // 2. Add Placeholders for KP and IMDB ratings (these will be updated later)
            // Use classes similar to the second script for consistency, styled via CSS
            details_nodes.push('<div class="full-start__rate rate--imdb loading" style="display: inline-flex;">...</div>');
            details_nodes.push('<div class="full-start__rate rate--kp loading" style="display: inline-flex;">...</div>');

            // 3. Add Genres, Runtime, PG rating
            var details_other = [];
            if (movie.genres && movie.genres.length > 0) {
                details_other.push(movie.genres.map(function (item) {
                    return Lampa.Utils.capitalizeFirstLetter(item.name);
                }).join(' | '));
            }
            if (movie.runtime) {
                details_other.push(Lampa.Utils.secondsToTime(movie.runtime * 60, true));
            }
            // if (movie.production_companies && movie.production_companies.length) {
                 // Example: Add first production company? Adjust as needed.
                 // details_other.push(movie.production_companies[0].name);
            // }
            if (pg) {
                details_other.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');
            }

             // Combine ratings and other details with splitters
             var final_details_html = details_nodes.join(''); // Join ratings without splitter initially
             if (details_nodes.length > 0 && details_other.length > 0) {
                 final_details_html += '<span class="new-interface-info__split details-splitter" style="display: none;">&#9679;</span>'; // Add hidden splitter between ratings and rest
             }
             final_details_html += details_other.join('<span class="new-interface-info__split">&#9679;</span>'); // Splitters within other details


            // Update HTML
            info_html.find('.new-interface-info__head').empty().append(head.join(', '));
            // Clear details first before appending new structure
            var details_container = info_html.find('.new-interface-info__details').empty();
            details_container.html(final_details_html); // Set the initial HTML structure


            // 4. Trigger external rating fetch AFTER drawing the initial structure
            this.loadExternalRatings(movie); // Pass the detailed movie data
        };

        this.load = function (data) {
             // Ensure data is valid
             if (!data || !data.id) {
                 console.log("Info Load Error: Invalid data received.", data);
                 // Optionally clear the panel or show an error
                 info_html.find('.new-interface-info__details').text('Error loading details.');
                 return;
             }

            var _this = this;
            clearTimeout(info_timer);

            // Fetch detailed data from TMDB (includes imdb_id if available)
            var media_type = data.name ? 'tv' : 'movie'; // Determine media type based on presence of 'name' (for TV) or 'title' (for movie - assumed if no name)
            var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));


            // Check cache for TMDB detailed data
            if (info_loaded[url]) {
                // console.log("TMDB: Detailed data from cache for", data.id);
                // Ensure cached data includes imdb_id if possible
                if(info_loaded[url].external_ids && !info_loaded[url].imdb_id){
                     info_loaded[url].imdb_id = info_loaded[url].external_ids.imdb_id;
                }
                this.draw(info_loaded[url]); // Draw using cached TMDB data
                return;
            }

            // console.log("TMDB: Fetching detailed data for", data.id, url);
            // Fetch TMDB detailed data if not cached
            info_timer = setTimeout(function () {
                info_network.clear();
                info_network.timeout(5000); // Keep TMDB timeout shorter
                info_network.silent(url, function (movie_detailed) {
                    // Add external_ids to the movie object if fetched (needed for imdb_id)
                     if (movie_detailed.external_ids) {
                         movie_detailed.imdb_id = movie_detailed.external_ids.imdb_id;
                         // You could add other IDs here if needed later
                     }
                     // Ensure title/name consistency for the rating search logic later
                     if (!movie_detailed.title && movie_detailed.name) movie_detailed.title = movie_detailed.name;
                     if (!movie_detailed.original_title && movie_detailed.original_name) movie_detailed.original_title = movie_detailed.original_name;


                    // console.log("TMDB: Detailed data received for", data.id, movie_detailed);
                    info_loaded[url] = movie_detailed; // Cache the detailed TMDB data
                    _this.draw(movie_detailed);      // Draw using fetched TMDB data
                }, function(a,c){
                    // console.log("TMDB: Error fetching detailed data", info_network.errorDecode(a,c));
                    // Maybe show error or draw with basic data?
                     // Pass the original data (which might be basic) to draw as fallback
                     _this.draw(data);
                });
            }, 100); // Reduced delay slightly
        };

        this.render = function () {
            return info_html;
        };

        this.empty = function () {
            // Clear ratings when info panel is emptied (e.g., on focus more)
             if (info_html) {
                 info_html.find('.rate--kp, .rate--imdb').empty().hide();
             }
        };

        this.destroy = function () {
            // Clear networks and remove element
            info_network.clear();
            rating_network.clear();
            if (info_html) {
                info_html.remove();
            }
            info_loaded = {};
            info_html = null;
        };
    } // End of create function (info panel controller)

    // --- Component Function (Main View Controller) ---
    // Largely unchanged, just ensure it uses the modified 'create' function
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            scroll_by_item: true
        });
        var items = [];
        var html = $('<div class="new-interface"><img class="full-start__background"></div>');
        var active = 0;
        var newlampa = Lampa.Manifest.app_digital >= 166;
        var info; // Instance of the 'create' object
        var lezydata;
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
        var background_img = html.find('.full-start__background');
        var background_last = '';
        var background_timer;

        this.create = function () {
            // No specific setup needed here now
        };

        this.empty = function () {
            var button;
            if (object.source == 'tmdb') {
                button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>');
                button.find('.selector').on('hover:enter', function () {
                    Lampa.Storage.set('source', 'cub');
                    Lampa.Activity.replace({ source: 'cub' });
                });
            }
            var empty = new Lampa.Empty();
            html.append(empty.render(button));
            this.start = empty.start;
            this.activity.loader(false);
            this.activity.toggle();
        };

        this.loadNext = function () {
            var _this = this;
            if (this.next && !this.next_wait && items.length) {
                this.next_wait = true;
                this.next(function (new_data) {
                    _this.next_wait = false;
                    // Check if data is an array before iterating
                    if (Array.isArray(new_data)) {
                       new_data.forEach(_this.append.bind(_this));
                    } else {
                        // console.log("loadNext: new_data is not an array", new_data);
                         // Handle cases where new_data might not be as expected
                         if(new_data && typeof new_data === 'object' && Array.isArray(new_data.results)) {
                              new_data.results.forEach(_this.append.bind(_this));
                         }
                    }

                     // Ensure active+1 exists before accessing render
                     if (items[active + 1]) {
                         Lampa.Layer.visible(items[active + 1].render(true));
                     }
                }, function () {
                    _this.next_wait = false;
                });
            }
        };


        this.push = function () {}; // Keep placeholder

        this.build = function (data) { // data here is the initial list data
            var _this2 = this;
            lezydata = data;

            // Use the modified 'create' function (now defined outside component)
            info = new create(); // Instantiate the info panel controller
            info.create(); // Call its create method to build HTML

            scroll.minus(info.render()); // Add info panel HTML to scroll exclusion

            var initial_items_to_render = [];
            // Check if data is array before slicing
            if(Array.isArray(data)) {
                initial_items_to_render = data.slice(0, viewall ? data.length : 2);
            } else {
                 // console.log("build: Initial data is not an array", data);
                 // Handle cases where initial data might not be as expected (e.g., API response object)
                 if(data && typeof data === 'object' && Array.isArray(data.results)) {
                      initial_items_to_render = data.results.slice(0, viewall ? data.results.length : 2);
                 }
            }

            // Append initial items
            initial_items_to_render.forEach(this.append.bind(this));


            html.append(info.render()); // Add info panel to the main component
            html.append(scroll.render()); // Add scroll area

            if (newlampa) {
                Lampa.Layer.update(html);
                Lampa.Layer.visible(scroll.render(true));
                scroll.onEnd = this.loadNext.bind(this);
                scroll.onWheel = function (step) {
                    // Ensure component is active before handling wheel events
                    if (Lampa.Activity.active() !== _this2.activity) return;

                    if (!Lampa.Controller.own(_this2)) {
                       // console.log("Wheel event but controller not owned, attempting to start");
                        _this2.start(); // Try to regain control if lost
                        // It might be better to prevent scroll if not focused/active
                        return;
                    }
                    if (step > 0) _this2.down();
                    else if (active > 0) _this2.up();
                };
            }

            // ***** BLOCK REMOVED *****
            // No initial info.update here. It will be triggered by onFocus/onHover.


            this.activity.loader(false);
            this.activity.toggle(); // This should eventually trigger focus/start
        };


        this.background = function (elem) {
             // Ensure elem is valid and has a backdrop_path
             if (!elem || !elem.backdrop_path) {
                 // console.log("Background: No backdrop path in", elem);
                 // Optionally clear background or set default
                 // background_img.removeClass('loaded').attr('src', '');
                 // background_last = '';
                 return;
             }

            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(background_timer);
            if (!new_background || new_background === background_last) return; // Don't change if no backdrop or same as last

            // console.log("Changing background to:", new_background);
            background_timer = setTimeout(function () {
                background_img.removeClass('loaded'); // Hide immediately
                var img = new Image();
                img.onload = function () {
                     // console.log("Background loaded:", new_background);
                    // Check if the background we loaded still matches the last requested one
                    // (Handles cases where focus changes quickly)
                    if(background_last === new_background) {
                        background_img.attr('src', new_background); // Set src only after load succeeds
                        background_img.addClass('loaded'); // Fade in
                    } else {
                         // console.log("Background loaded, but focus changed before load completed. Ignoring.");
                    }
                };
                img.onerror = function () {
                     // console.log("Background failed to load:", new_background);
                    // Only clear if this failed URL is still the last one requested
                    if(background_last === new_background) {
                        background_img.removeClass('loaded');
                        background_img.attr('src', ''); // Clear src on error
                        background_last = ''; // Allow retry on next focus if needed
                    }
                };
                background_last = new_background; // Set last requested URL *before* starting load
                img.src = new_background; // Start loading the image

            }, 300); // Delay before starting load
        };


        this.append = function (element) {
            var _this3 = this;
            // Basic check for element validity
            if (!element || typeof element !== 'object' || !element.id) {
                 // console.log("Append Error: Invalid element received.", element);
                 return;
            }
            // Check if item already added (using id as identifier)
            if (items.some(function(existing_item) { return existing_item.data && existing_item.data.id === element.id; })) {
                 // console.log("Append: Item already exists, skipping.", element.id);
                 return;
            }

            if (element.ready) return; // Use existing ready flag if present
            element.ready = true;


             // Ensure title/name consistency for the info panel update later
             if (!element.title && element.name) element.title = element.name;
             if (!element.original_title && element.original_name) element.original_title = element.original_name;


            var item = new Lampa.InteractionLine(element, {
                // url: element.url, // 'url' might not be needed if handled by InteractionLine
                card_small: true,
                // cardClass: element.cardClass, // Might not be needed
                // genres: object.genres, // Might not be needed
                // object: object, // Might not be needed
                card_wide: true,
                // nomore: element.nomore // Might not be needed
            });
            item.create();
            // Store the original data explicitly if InteractionLine doesn't do it reliably
            // item.custom_data = element; // Use a custom property if item.data is unreliable

            item.onDown = this.down.bind(this);
            item.onUp = this.up.bind(this);
            item.onBack = this.back.bind(this);

            item.onToggle = function (/* Toggled Element - not typically provided by onToggle */) {
                 // console.log("Item toggled", items.indexOf(item));
                 active = items.indexOf(item);
                 // No update needed here, focus/hover handles info panel
            };

            if (this.onMore) item.onMore = this.onMore.bind(this);

             // Use item.data which InteractionLine should store
             // Add checks to ensure item.data is valid
            item.onFocus = function (/* DOM Element */) {
                 var current_item_data = item.data; // || item.custom_data; // Use fallback if needed
                 // console.log("Item focused", current_item_data ? current_item_data.title : 'No Data');
                 if (info && current_item_data) {
                     info.update(current_item_data); // Pass the data associated with the item
                     _this3.background(current_item_data);
                 } else if (!info) {
                     // console.log("Focus Error: Info panel instance not found.");
                 } else {
                     // console.log("Focus Error: No data found for focused item.", item);
                 }
            };

            item.onHover = function (/* DOM Element */) {
                 var current_item_data = item.data; // || item.custom_data;
                 // console.log("Item hovered", current_item_data ? current_item_data.title : 'No Data');
                 if (info && current_item_data) {
                     info.update(current_item_data);
                     _this3.background(current_item_data);
                 } else if (!info) {
                      // console.log("Hover Error: Info panel instance not found.");
                 } else {
                      // console.log("Hover Error: No data found for hovered item.", item);
                 }
            };


            item.onFocusMore = function() {
                 if(info) info.empty(); // Clear info panel when "More" is focused
            }

            scroll.append(item.render());
            items.push(item);
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.down = function () {
            // Ensure items array is not empty and active index is valid
            if (!items.length || active >= items.length -1) return;

            active++;
            // Ensure active index is still valid after incrementing
            active = Math.min(active, items.length - 1);

            // Lazy load more items if needed
            var data_source = Array.isArray(lezydata) ? lezydata : (lezydata && Array.isArray(lezydata.results) ? lezydata.results : []);
            if (!viewall && data_source.length > 0) {
                 data_source.slice(0, active + 2).forEach(this.append.bind(this)); // Append checks for duplicates
            }

             // Check if item exists before toggling/updating scroll
             if(items[active]) {
                 items[active].toggle();
                 scroll.update(items[active].render());
             } else {
                  // console.log("Down Error: Item at index", active, "not found after increment.");
             }
        };


        this.up = function () {
             // Ensure items array is not empty and active index is valid
             if (!items.length || active <= 0) {
                 // If already at the top or no items, try toggling head
                 Lampa.Controller.toggle('head');
                 return;
             }

            active--;
             // Ensure active index is valid after decrementing
            if (active < 0) active = 0; // Should not happen due to initial check, but safeguard

            // Check if item exists before toggling/updating scroll
            if (items[active]) {
                items[active].toggle();
                scroll.update(items[active].render());
            } else {
                 // console.log("Up Error: Item at index", active, "not found after decrement.");
                 // If error, maybe toggle head as fallback
                 Lampa.Controller.toggle('head');
            }
        };


        this.start = function () {
            var _this4 = this;
             // console.log("Starting component controller, current active index:", active);
            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() {
                    // When controller gives focus back to this component
                    // console.log("Controller toggling to content, focusing item:", active);
                    if (items.length && items[active]) {
                        items[active].toggle(); // This should handle the focus internally
                    }
                     else {
                          // console.log("Controller toggle: No items or invalid active index", active);
                          // Maybe focus the first item if possible?
                          if (items.length > 0) {
                              active = 0;
                              items[0].toggle();
                          } else {
                              // Or if no items, maybe toggle menu/head?
                              Lampa.Controller.toggle('head');
                          }
                     }
                },
                update: function update() {}, // Placeholder
                left: function left() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function right() {
                     if (Navigator.canmove('right')) Navigator.move('right');
                    // else { // Optional: Handle hitting right edge
                    //    console.log("Right edge hit");
                    // }
                },
                up: function up() {
                    // Use internal navigation logic which handles boundaries
                    _this4.up();
                },
                down: function down() {
                    // Use internal navigation logic which handles boundaries
                   _this4.down();
                },
                back: this.back // Use component's back method
            });
            Lampa.Controller.toggle('content');
             // It seems toggle() above should handle initial focus now.
        };


        this.refresh = function () {
            this.activity.loader(true);
            this.activity.need_refresh = true;
            // Add logic to actually re-fetch data here if needed
            // Lampa.Activity.replace() or similar might be required
            // console.log("Refresh called, but not implemented");
            // For now, just stop loader if no action taken
             // this.activity.loader(false);
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
             // console.log("Destroying new interface component");
            network.clear();
            clearTimeout(background_timer); // Clear background timer

            // Destroy info panel first
            if (info) {
                info.destroy();
                info = null;
            }
            // Then destroy items and scroll
            // Use Lampa.Arrays.destroy if it handles potential errors
            if (items) Lampa.Arrays.destroy(items);
             // Or manually if needed:
             // if (items) {
             //     items.forEach(function(item) { if(item && item.destroy) item.destroy(); });
             //     items = null;
             // }

            if (scroll) scroll.destroy();

            // Remove main html last
            if(html) html.remove();

            // Nullify references
            items = null;
            scroll = null;
            network = null;
            lezydata = null;
            html = null;
            background_img = null; // Clear image ref
            object = null; // Clear reference to initial object
        };
    } // --- End Component Function ---


    // --- Plugin Initialization ---
    function startPlugin() {
        window.plugin_interface_ready = true; // Use a more specific name if needed
        var old_interface = Lampa.InteractionMain;
        var new_interface_component = component; // Reference the component function

        // Ensure Lampa.InteractionMain is available before attempting override
        if (typeof Lampa.InteractionMain !== 'function') {
             console.error("New Interface Error: Lampa.InteractionMain is not defined yet.");
             // Optionally retry after a delay
             // setTimeout(startPlugin, 500);
             return;
        }


        Lampa.InteractionMain = function (object) { // object is passed by Lampa when creating a view
            var use_new_interface = true; // Default to true

             // Check if object is valid before accessing properties
             if (!object || typeof object !== 'object') {
                 console.warn("New Interface Init: Invalid 'object' received, using old interface.", object);
                 use_new_interface = false;
             } else {
                 // Conditions to fallback to old interface
                 if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false;
                 if (window.innerWidth < 767) use_new_interface = false;
                 if (!Lampa.Account.hasPremium()) use_new_interface = false;
                 if (Lampa.Manifest.app_digital < 153) use_new_interface = false; // Keep existing version check
             }


            // TEMP: Force old interface for debugging if needed
            // use_new_interface = false;

             // console.log("Using new interface:", use_new_interface, "for source:", object ? object.source : 'N/A');

            var InterfaceClass = use_new_interface ? new_interface_component : old_interface;

            // Ensure the chosen class is a function before instantiating
            if (typeof InterfaceClass !== 'function') {
                 console.error("New Interface Error: Could not determine valid interface class. Falling back to old.", InterfaceClass);
                 InterfaceClass = old_interface; // Fallback just in case
                 if (typeof InterfaceClass !== 'function') {
                      console.error("New Interface Error: Fallback old_interface is also not a function!");
                      // Cannot proceed - maybe return an empty object or throw error?
                      return {}; // Return empty object to avoid crashing Lampa further
                 }
            }

            return new InterfaceClass(object); // Instantiate the chosen class
        };

        // --- CSS Styles ---
        // Use a unique identifier for the style tag
        var style_tag_id = 'new-interface-styles-with-ratings';
        Lampa.Template.add(style_tag_id, `
        <style id="${style_tag_id}">
        /* Base styles from original script */
        .new-interface .card--small.card--wide { width: 18.3em; }
        .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
        .new-interface-info__body { width: 80%; padding-top: 1.1em; }
        .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
        .new-interface-info__head span { color: #fff; }
        .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
        .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; }
        .new-interface-info__split { margin: 0 0.8em; /* Adjusted margin slightly */ font-size: 0.7em; display: inline-block; /* Ensure it behaves well with flex */ vertical-align: middle; /* Align splitters better */ }
        .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
        .new-interface .card-more__box { padding-bottom: 95%; }
        .new-interface .full-start__background { position: absolute; left:0; right:0; width: 100%; height: 108%; top: -6em; object-fit: cover; object-position: center center; opacity: 0; transition: opacity 0.5s ease; z-index: -1; /* Ensure background is behind content */ }
        .new-interface .full-start__background.loaded { opacity: 1; } /* Fade in when loaded */
        .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0; display: inline-flex; /* Use flex for alignment */ flex-direction: column; align-items: center; text-align: center; min-width: 3.5em; /* Give some base width */ vertical-align: middle; /* Align with text/splitters */ }
        .new-interface .full-start__rate > div:first-child { font-weight: bold; font-size: 1.1em; /* Make number slightly larger */ }
        .new-interface .full-start__rate > div:last-child { font-size: 0.8em; color: rgba(255,255,255,0.7); /* Dim the label */ text-transform: uppercase; }

        /* Specific styles for KP and IMDB ratings */
        .new-interface .rate--kp,
        .new-interface .rate--imdb {
            /* Inherit base styles from .full-start__rate */
        }

        /* Loading state for ratings */
        .new-interface .full-start__rate.loading {
            min-width: 2.5em; /* Smaller width while loading */
            color: rgba(255,255,255,0.5); /* Dim color */
            justify-content: center; /* Center the '...' text */
            /* Remove text labels during loading */
        }
         .new-interface .full-start__rate.loading > div { display: none; } /* Hide existing divs */
         .new-interface .full-start__rate.loading::after {
             /* Basic dot animation example */
             content: '.';
             animation: dots 1s steps(5, end) infinite;
             display: inline-block;
             width: 1em; /* Adjust width for dots */
             text-align: left;
             font-size: 1.1em; /* Match number size */
             font-weight: bold; /* Match number weight */
         }

         @keyframes dots {
             0%, 20% { color: rgba(0,0,0,0); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); }
             40% { color: rgba(255,255,255,0.5); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); }
             60% { text-shadow: .25em 0 0 rgba(255,255,255,0.5), .5em 0 0 rgba(0,0,0,0); }
             80%, 100% { text-shadow: .25em 0 0 rgba(255,255,255,0.5), .5em 0 0 rgba(255,255,255,0.5); }
         }


        .new-interface .card__promo { display: none; }
        .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
        .new-interface .card.card--wide .card-watched { display: none !important; }
        body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
        body.light--version .new-interface-info { height: 25.3em; }
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
        </style>
        `);
        // Ensure template is appended or updated correctly, only once
        if ($('#' + style_tag_id).length === 0) {
             $('body').append(Lampa.Template.get(style_tag_id, {}, true));
        }
    } // --- End startPlugin ---

    // Initialize if not already done
    // Add a check for Lampa being ready before initializing
    if (window.Lampa && !window.plugin_interface_ready) {
        startPlugin();
    } else if (!window.plugin_interface_ready) {
         // If Lampa is not ready, listen for an event or use setTimeout
         // console.log("New Interface: Lampa not ready, delaying init...");
         var init_timer = setInterval(function() {
             if (window.Lampa && window.Lampa.Api && window.Lampa.Utils) { // Check for specific Lampa components
                 clearInterval(init_timer);
                 // console.log("New Interface: Lampa ready, initializing now.");
                 if (!window.plugin_interface_ready) { // Double check flag
                    startPlugin();
                 }
             }
         }, 200); // Check every 200ms
         // Add a timeout safeguard
         setTimeout(function() {
             if (!window.plugin_interface_ready) {
                 clearInterval(init_timer);
                 console.error("New Interface: Timed out waiting for Lampa to initialize.");
             }
         }, 10000); // Wait max 10 seconds
    }


})(); // --- End IIFE ---
