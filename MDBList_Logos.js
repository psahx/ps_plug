// == Combined Version | MDBList Ratings + Movie Logo Toggle ==
(function () {
    'use strict';

    // Initialize shared cache for logos (accessible by both focus and full screen logic)
    window.shared_logo_cache = window.shared_logo_cache || {};

    // --- Fetcher Configuration --- (Original - Unchanged)
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 12 * 1000,
        cache_key: 'mdblist_ratings_cache',
        cache_limit: 500,
        request_timeout: 10000
    };

    // --- Language Strings ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            // --- Original MDBList Strings ---
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта MDBList.com",
                en: "Enter your API key from MDBList.com",
                uk: "Введіть ваш API ключ з сайту MDBList.com"
            },
            additional_ratings_title: {
                 ru: "Дополнительные Рейтинги",
                 en: "Additional Ratings",
                 uk: "Додаткові Рейтинги"
            },
            select_ratings_button_name: {
                 en: "Select Rating Providers",
                 ru: "Выбрать Источники Рейтингов",
                 uk: "Обрати Джерела Рейтингів"
            },
            select_ratings_button_desc: {
                 en: "Choose which ratings to display",
                 ru: "Выберите, какие рейтинги отображать",
                 uk: "Оберіть, які рейтинги відображати"
            },
            select_ratings_dialog_title: {
                 en: "Select Ratings",
                 ru: "Выбор Рейтингов",
                 uk: "Вибір Рейтингів"
            },
            // --- New Movie Logo Strings ---
            movie_logo_toggle_name: {
                en: "Movie Logo",
                ru: "Логотип фильма",
                uk: "Логотип фільму"
            },
            movie_logo_toggle_desc: {
                en: "Display media logos instead of text titles",
                ru: "Отображать логотипы медиа вместо текстовых названий",
                uk: "Відображати логотипи медіа замість текстових назв"
            },
            // --- Original Full Notext ---
            full_notext: {
                 en: 'No description',
                 ru: 'Нет описания'
            }
        });
    }


    // --- Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        // 1. Add the Settings Category (Original - Unchanged)
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>' // Simple placeholder icon
        });

        // *** NEW: Add Movie Logo Toggle Setting ***
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', // Target the existing component
            param: {
                name: 'show_media_logos',     // Internal name for the setting value
                type: 'trigger',             // Use toggle switch type
                'default': 'true',           // Default state (true = on)
            },
            field: {
                name: Lampa.Lang.translate('movie_logo_toggle_name'),       // Display name (translated)
                description: Lampa.Lang.translate('movie_logo_toggle_desc') // Description (translated)
            },
            onChange: function() {
                // Optional: Could potentially clear logo cache here if needed, but usually not necessary
                // Lampa.Settings.update(); // Lampa usually handles this for triggers
            }
        });
        // *** END NEW Setting ***

        // 2. Add the API Key parameter (Original - Unchanged)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: {
                name: 'mdblist_api_key',
                type: 'input',
                'default': '',
                values: {},
                placeholder: 'Enter your MDBList API Key'
            },
            field: {
                name: 'MDBList API Key',
                description: Lampa.Lang.translate('mdblist_api_key_desc')
            },
            onChange: function() {
                Lampa.Settings.update();
            }
        });

        // 3. Add Button to Open Rating Selection (Original - Unchanged)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: {
                name: 'select_ratings_button',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('select_ratings_button_name'),
                description: Lampa.Lang.translate('select_ratings_button_desc')
            },
            onChange: function () {
                showRatingProviderSelection();
            }
        });

    } else {
        console.error("MDBLIST_Fetcher+Logo: Lampa.SettingsApi not available.");
    }

    // --- Network Instance --- (Original - Unchanged)
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions --- (Original - Unchanged)
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});

        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache);
                return false;
            }
           return cache[tmdb_id].data;
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        cache[tmdb_id] = {
            timestamp: timestamp,
            data: data
        };
        Lampa.Storage.set(config.cache_key, cache);
      }

    // --- Core Fetching Logic --- (Original - Unchanged)
    function fetchRatings(movieData, callback) {
        if (!network) {
             console.error("MDBLIST_Fetcher: Lampa.Reguest not available.");
             if (callback) callback({ error: "Network component unavailable" });
             return;
        }
        if (!window.Lampa || !Lampa.Storage) {
             console.error("MDBLIST_Fetcher: Lampa.Storage not available.");
             if (callback) callback({ error: "Storage component unavailable" });
             return;
        }
        if (!movieData || !movieData.id || !movieData.method || !callback) {
             console.error("MDBLIST_Fetcher: Invalid input - requires movieData object with 'id' and 'method' ('movie'/'tv'), and a callback function.");
             if (callback) callback({ error: "Invalid input data" });
             return;
        }
        var tmdb_id = movieData.id;
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) {
            callback(cached_ratings);
            return;
        }
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) {
            callback({ error: "MDBList API Key not configured in Additional Ratings settings" });
            return;
        }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);

        network.clear();
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            var ratingsResult = { error: null };
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) {
                     if (rating.source && rating.value !== null) {
                          ratingsResult[rating.source] = rating.value;
                     }
                 });
            } else if (response && response.error) {
                console.error("MDBLIST_Fetcher: API Error from MDBList for TMDB ID:", tmdb_id, response.error);
                ratingsResult.error = "MDBList API Error: " + response.error;
            }
             else {
                 console.error("MDBLIST_Fetcher: Invalid response format received from MDBList for TMDB ID:", tmdb_id, response);
                 ratingsResult.error = "Invalid response format from MDBList";
            }
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setCache(tmdb_id, ratingsResult);
            }
            callback(ratingsResult);
        }, function (xhr, status) {
            var errorMessage = "MDBList request failed";
            if (status) { errorMessage += " (Status: " + status + ")"; }
            console.error("MDBLIST_Fetcher:", errorMessage, "for TMDB ID:", tmdb_id);
            var errorResult = { error: errorMessage };
            if (status !== 401 && status !== 403) {
                setCache(tmdb_id, errorResult);
            }
            callback(errorResult);
        });
    }

    // --- MDBList Fetcher State --- (Original - Unchanged)
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};

    // --- Function to display rating provider selection --- (Original - Unchanged)
    function showRatingProviderSelection() {
        const providers = [
            { title: 'IMDb', id: 'show_rating_imdb', default: true }, { title: 'TMDB', id: 'show_rating_tmdb', default: true },
            { title: 'Rotten Tomatoes (Critics)', id: 'show_rating_tomatoes', default: false }, { title: 'Rotten Tomatoes (Audience)', id: 'show_rating_audience', default: false },
            { title: 'Metacritic', id: 'show_rating_metacritic', default: false }, { title: 'Trakt', id: 'show_rating_trakt', default: false },
            { title: 'Letterboxd', id: 'show_rating_letterboxd', default: false }, { title: 'Roger Ebert', id: 'show_rating_rogerebert', default: false }
        ];
        let selectItems = providers.map(provider => {
            let storedValue = Lampa.Storage.get(provider.id, provider.default);
            let isChecked = (storedValue === true || storedValue === 'true');
            return { title: provider.title, id: provider.id, checkbox: true, checked: isChecked, default: provider.default };
        });
        var currentController = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), items: selectItems,
            onBack: function () { Lampa.Controller.toggle(currentController || 'settings'); },
            onCheck: function (item) {
                let oldValue = Lampa.Storage.get(item.id, item.default);
                let oldStateIsChecked = (oldValue === true || oldValue === 'true');
                let newStateIsChecked = !oldStateIsChecked;
                Lampa.Storage.set(item.id, newStateIsChecked);
                item.checked = newStateIsChecked;
            }
        });
    }

    // --- create function (Info Panel Handler) ---
    function create() {
        var html; var timer;
        // Use a local network instance *if needed* by create/draw/load, otherwise rely on passed data
        var network = new Lampa.Reguest(); // Kept original network instance here
        var loaded = {};

        // Function to handle logo fetching and display (shared logic for focus/details)
        function displayLogoIfNeeded(targetElement$, movieData, isFullScreen) {
            // Check the setting first
            if (Lampa.Storage.get('show_media_logos', 'true') !== 'true') {
                // If setting is off, ensure text title is displayed (might be redundant but safe)
                if (!isFullScreen && movieData.title) {
                     targetElement$.text(movieData.title);
                }
                // For full screen, Lampa likely handles text title restoration automatically if plugin doesn't replace it.
                return;
            }

            // Proceed only if we have movie data and ID
            if (!movieData || !movieData.id) return;

            let unique_id = (movieData.name ? 'tv_' : 'movie_') + movieData.id; // Unique ID for cache
            let logoMaxHeight = isFullScreen ? '125px' : '125px'; // Use 125px for both as requested initially
            // If you later decide the focus area needs smaller, change the second '125px'

            // 1. Check Cache
            if (window.shared_logo_cache.hasOwnProperty(unique_id)) {
                let cached_data = window.shared_logo_cache[unique_id];
                if (cached_data && cached_data !== 'not_found') {
                    targetElement$.html(cached_data); // Use cached HTML
                } else {
                    // 'not_found' cached, ensure text title is shown (primarily for focus view)
                     if (!isFullScreen && movieData.title) targetElement$.text(movieData.title);
                }
                return; // Stop processing, used cache
            }

            // 2. Fetch Logo (if not cached)
            // Ensure text title is shown initially while fetching (important for focus view)
             if (!isFullScreen && movieData.title) targetElement$.text(movieData.title);

            let item_id = movieData.id;
            let method = movieData.method || (movieData.name ? 'tv' : 'movie'); // Ensure method is available
            let api_path = (method === 'tv' ? `tv/${item_id}/images` : `movie/${item_id}/images`);

            // Use Lampa's TMDB helper to build the URL
            let api_url = Lampa.TMDB.api(api_path + "?api_key=" + Lampa.TMDB.key() + "&language=" + Lampa.Storage.get("language"));

            // Use jQuery $.get for simplicity here, separate from the ratings network instance
            $.get(api_url, function(response) {
                let logo_url = null;
                let logo_path = null;

                if (response.logos && response.logos.length > 0) {
                    // Optional: Add logic to find best logo (e.g., language match)
                    logo_path = response.logos[0].file_path; // Take first for simplicity
                }

                if (logo_path) {
                    logo_url = Lampa.TMDB.image("/t/p/w300" + logo_path.replace(".svg", ".png")); // Use w300 size
                    let img_html = `<img class="plugin-logo-${isFullScreen ? 'full' : 'focus'}" style="max-height: ${logoMaxHeight}; width: auto; max-width: 90%; display: block; margin: 5px auto 0 auto;" src="${logo_url}" alt="Logo"/>`;

                    targetElement$.html(img_html); // Update element with logo
                    window.shared_logo_cache[unique_id] = img_html; // Cache the result HTML
                } else {
                    // No logo found
                    window.shared_logo_cache[unique_id] = 'not_found';
                    // Ensure text title remains if no logo found (primarily for focus view)
                    if (!isFullScreen && movieData.title) targetElement$.text(movieData.title);
                }
            }).fail(function() {
                console.error("MovieLogo: API call failed for logo", unique_id);
                window.shared_logo_cache[unique_id] = 'not_found'; // Cache failure
                 // Ensure text title remains on failure (primarily for focus view)
                 if (!isFullScreen && movieData.title) targetElement$.text(movieData.title);
            });
        } // End displayLogoIfNeeded

        this.create = function () { // (Original Structure - Unchanged)
             html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
        };

        this.update = function (data) { // ** MODIFIED to include logo logic **
            var _this = this;
            // Set default text content first (Original - Unchanged)
            html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            html.find('.new-interface-info__title').text(data.title); // Set text title initially
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            // *** NEW: Call logo display function for the focus view ***
            // Pass the target jQuery element, the movie data, and isFullScreen=false
            displayLogoIfNeeded(html.find('.new-interface-info__title'), data, false);
            // *** END NEW ***


            // --- Original MDBList Rating Fetch Logic --- (Unchanged)
            delete mdblistRatingsCache[data.id];
            delete mdblistRatingsPending[data.id];
            if (data.id && data.method) {
                mdblistRatingsPending[data.id] = true;
                fetchRatings(data, function(mdblistResult) { // Uses the fetchRatings defined earlier
                    mdblistRatingsCache[data.id] = mdblistResult;
                    delete mdblistRatingsPending[data.id];
                    // The rest of the original TMDB fetch for details seems redundant if load() does it too,
                    // but keeping it as per the "don't change original" rule.
                    var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                    if (loaded[tmdb_url]) {
                        _this.draw(loaded[tmdb_url]);
                    }
                 });
            } else if (!data.method) { /* Optional warning */ }
            this.load(data); // Calls the original load function below
        }; // End update function

        this.draw = function (data) { // (Original Draw Function - Unchanged)
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [];
            var lineOneDetails = [];
            var genreDetails = [];
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png'; const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg'; const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg'; const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg'; const rtAudienceFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_positive_audience.svg'; const rtAudienceSpilledLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_negative_audience.svg'; const metacriticLogoUrl = 'https://psahx.github.io/ps_plug/Metacritic_M.png'; const traktLogoUrl = 'https://psahx.github.io/ps_plug/Trakt.svg'; const letterboxdLogoUrl = 'https://psahx.github.io/ps_plug/letterboxd-decal-dots-pos-rgb.svg'; const rogerEbertLogoUrl = 'https://psahx.github.io/ps_plug/Roger_Ebert.jpeg';

            let imdbStored = Lampa.Storage.get('show_rating_imdb', true); const showImdb = (imdbStored === true || imdbStored === 'true'); let tmdbStored = Lampa.Storage.get('show_rating_tmdb', true); const showTmdb = (tmdbStored === true || tmdbStored === 'true'); let tomatoesStored = Lampa.Storage.get('show_rating_tomatoes', false); const showTomatoes = (tomatoesStored === true || tomatoesStored === 'true'); let audienceStored = Lampa.Storage.get('show_rating_audience', false); const showAudience = (audienceStored === true || audienceStored === 'true'); let metacriticStored = Lampa.Storage.get('show_rating_metacritic', false); const showMetacritic = (metacriticStored === true || metacriticStored === 'true'); let traktStored = Lampa.Storage.get('show_rating_trakt', false); const showTrakt = (traktStored === true || traktStored === 'true'); let letterboxdStored = Lampa.Storage.get('show_rating_letterboxd', false); const showLetterboxd = (letterboxdStored === true || letterboxdStored === 'true'); let rogerEbertStored = Lampa.Storage.get('show_rating_rogerebert', false); const showRogerebert = (rogerEbertStored === true || rogerEbertStored === 'true');

            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            var mdblistResult = mdblistRatingsCache[data.id]; // Uses cache populated by fetchRatings

            if (showImdb) { var imdbRating = mdblistResult && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number' ? parseFloat(mdblistResult.imdb || 0).toFixed(1) : '0.0'; lineOneDetails.push('<div class="full-start__rate imdb-rating-item">' + '<div>' + imdbRating + '</div>' + '<img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false">' + '</div>'); }
            if (showTmdb) { lineOneDetails.push('<div class="full-start__rate tmdb-rating-item">' + '<div>' + vote + '</div>' + '<img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false">' + '</div>'); }
            if (showTomatoes) { if (mdblistResult && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { lineOneDetails.push('<div class="full-start__rate rt-rating-item">' + '<div class="rt-score">' + score + '</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Critics" draggable="false">' + '</div>'); } } }
            if (showAudience) { if (mdblistResult && mdblistResult.popcorn != null) { let parsedScore = parseFloat(mdblistResult.popcorn); if (!isNaN(parsedScore)) { let score = parsedScore; let logoUrl = ''; if (score >= 60) { logoUrl = rtAudienceFreshLogoUrl; } else if (score >= 0) { logoUrl = rtAudienceSpilledLogoUrl; } if (logoUrl) { lineOneDetails.push('<div class="full-start__rate rt-audience-rating-item">' + '<div class="rt-audience-score">' + score + '</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-audience-logo" alt="RT Audience" draggable="false">' + '</div>'); } } } }
            if (showMetacritic) { if (mdblistResult && typeof mdblistResult.metacritic === 'number' && mdblistResult.metacritic !== null) { let score = mdblistResult.metacritic; if (score >= 0) { lineOneDetails.push('<div class="full-start__rate metacritic-rating-item">' + '<div class="metacritic-score">' + score + '</div>' + '<img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" alt="Metacritic" draggable="false">' + '</div>'); } } }
            if (showTrakt) { if (mdblistResult && mdblistResult.trakt != null) { let parsedScore = parseFloat(mdblistResult.trakt); if (!isNaN(parsedScore)) { let score = parsedScore; if (score >= 0) { lineOneDetails.push('<div class="full-start__rate trakt-rating-item">' + '<div class="trakt-score">' + score + '</div>' + '<img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" alt="Trakt" draggable="false">' + '</div>'); } } } }
            if (showLetterboxd) { if (mdblistResult && mdblistResult.letterboxd != null) { let parsedScore = parseFloat(mdblistResult.letterboxd); if (!isNaN(parsedScore)) { let score = parsedScore.toFixed(1); if (parsedScore >= 0) { lineOneDetails.push('<div class="full-start__rate letterboxd-rating-item">' + '<div class="letterboxd-score">' + score + '</div>' + '<img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" alt="Letterboxd" draggable="false">' + '</div>'); } } } }
            if (showRogerebert) { if (mdblistResult && mdblistResult.rogerebert != null) { let parsedScore = parseFloat(mdblistResult.rogerebert); if (!isNaN(parsedScore)) { let score = parsedScore.toFixed(1); if (parsedScore >= 0) { lineOneDetails.push('<div class="full-start__rate rogerebert-rating-item">' + '<div class="rogerebert-score">' + score + '</div>' + '<img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" alt="Roger Ebert" draggable="false">' + '</div>'); } } } }

            if (data.runtime) { lineOneDetails.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); }
            if (pg) { lineOneDetails.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }

            if (data.genres && data.genres.length > 0) { genreDetails.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); }

            html.find('.new-interface-info__head').empty().append(head.join(', '));
            let lineOneHtml = lineOneDetails.join('<span class="new-interface-info__split">&#9679;</span>');
            let genresHtml = genreDetails.length > 0 ? genreDetails[0] : '';
            let finalDetailsHtml = '';
            if (lineOneDetails.length > 0) { finalDetailsHtml += `<div class="line-one-details">${lineOneHtml}</div>`; }
             if (genresHtml) { finalDetailsHtml += `<div class="genre-details-line">${genresHtml}</div>`; }
            html.find('.new-interface-info__details').html(finalDetailsHtml);
        }; // End draw function

        this.load = function (data) { // (Original Load Function - Unchanged)
            var _this = this; clearTimeout(timer);
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
            if (loaded[url]) return this.draw(loaded[url]);
            timer = setTimeout(function () {
                network.clear(); network.timeout(5000);
                network.silent(url, function (movie) {
                    loaded[url] = movie;
                    if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; // Ensure method is set
                    _this.draw(movie);
                });
            }, 300);
        }; // End load function

        this.render = function () { return html; }; // (Original - Unchanged)
        this.empty = function () {}; // (Original - Unchanged)
        this.destroy = function () { // (Original - Unchanged)
             html.remove(); loaded = {}; html = null;
             // Clear MDBList caches specific to this instance if needed, though global might be fine
             mdblistRatingsCache = {}; mdblistRatingsPending = {};
        }; // End destroy function
    } // End create function


    // --- component function (Main List Handler) --- (Original - Unchanged, including onFocus/onHover calls to info.update)
    function component(object) { var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer; this.create = function () {}; this.empty = function () { var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); html.append(empty.render(button)); this.start = empty.start; this.activity.loader(false); this.activity.toggle(); }; this.loadNext = function () { var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; new_data.forEach(_this.append.bind(_this)); Lampa.Layer.visible(items[active + 1].render(true)); }, function () { _this.next_wait = false; }); } }; this.push = function () {}; this.build = function (data) { var _this2 = this; lezydata = data; info = new create(object); info.create(); scroll.minus(info.render()); data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); html.append(info.render()); html.append(scroll.render()); if (newlampa) { Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; } if (items.length > 0 && items[0] && items[0].data) { active = 0; info.update(items[active].data); this.background(items[active].data); } this.activity.loader(false); this.activity.toggle(); }; this.background = function (elem) { if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (new_background == background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); }, 1000); }; this.append = function (element) { if (element.ready) return; var _this3 = this; element.ready = true; var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore }); item.create(); item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this); item.onToggle = function () { active = items.indexOf(item); }; if (this.onMore) item.onMore = this.onMore.bind(this); item.onFocus = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; item.onHover = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; item.onFocusMore = info.empty.bind(info); scroll.append(item.render()); items.push(item); }; this.back = function () { Lampa.Activity.backward(); }; this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); }; this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } }; this.start = function () { var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, back: this.back }); Lampa.Controller.toggle('content'); }; this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; }; this.pause = function () {}; this.stop = function () {}; this.render = function () { return html; }; this.destroy = function () { clearTimeout(background_timer); network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); if (html) html.remove(); items = null; network = null; lezydata = null; info = null; html = null; }; }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        // Check Lampa components (Original - Unchanged)
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { console.error("NewInterface+Logo: Missing Lampa components"); return; }
        // Lampa.Lang.add for full_notext moved to main Lang block

        // Apply Interface Override (Original - Unchanged)
        window.plugin_interface_ready = true; // Use the original flag name
        var old_interface = Lampa.InteractionMain;
        var new_interface = component; // Use the component defined above
        Lampa.InteractionMain = function (object) { var use = new_interface; if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; if (window.innerWidth < 767) use = old_interface; if (!Lampa.Account.hasPremium()) use = old_interface; if (Lampa.Manifest.app_digital < 153) use = old_interface; return new use(object); };

        // Apply CSS Styles (Original - Unchanged)
        var style_id = 'new_interface_style_adjusted_padding';
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove(); // Clean up previous
            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            /* --- All Original CSS from your provided code - UNCHANGED --- */
            .new-interface .card--small.card--wide { width: 18.3em; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
            .new-interface-info__details { margin-bottom: 1em; display: block; min-height: 1.9em; font-size: 1.1em; }
            .line-one-details { margin-bottom: 0.6em; line-height: 1.5; }
            .genre-details-line { margin-top: 1em; line-height: 1.5; }
            .new-interface-info__split { margin: 0 0.5em; font-size: 0.7em; }
            .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
            .new-interface .card-more__box { padding-bottom: 95%; }
            .new-interface .full-start__background { height: 108%; top: -6em; }
            .new-interface .card__promo { display: none; }
            .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
            .new-interface .card.card--wide .card-watched { display: none !important; }
            body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
            body.light--version .new-interface-info { height: 25.3em; }
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
            .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.4em; overflow: hidden; height: auto; }
            .new-interface .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
            .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
            .tmdb-logo { height: 0.9em; }
            .rt-logo { height: 1.1em; }
            /* --- End Original CSS --- */
            </style>
            `);
          $('body').append(Lampa.Template.get(style_id, {}, true));
        }

        // *** NEW: Add Full Screen Logo Listener ***
        // Guard to prevent adding listener multiple times
        if (!window.logo_plugin_fullscreen_listener_added) {
            window.logo_plugin_fullscreen_listener_added = true;

            Lampa.Listener.follow("full", function(listenerEventData) {
                // Check if the event indicates the full screen is ready
                // Use 'complite' as per original simple plugin, adjust if needed
                if (listenerEventData.type !== 'complite') return;

                // Find the target title element for the full screen
                // IMPORTANT: Verify '.full-start-new__title' is correct for your setup.
                var targetElement$ = listenerEventData.object.activity.render().find('.full-start-new__title');

                // Ensure the target element exists
                if (!targetElement$.length) {
                     console.error("MovieLogo FullScreen: Target '.full-start-new__title' not found.");
                     return;
                }

                var movieData = listenerEventData.data.movie;

                // Call the shared logo display function
                // Pass target element, movie data, and isFullScreen=true
                // Need to find the create() function's displayLogoIfNeeded helper.
                // For simplicity here, we duplicate the logic slightly, using the shared cache.

                 // Check the setting first
                if (Lampa.Storage.get('show_media_logos', 'true') !== 'true') return;

                // Proceed only if we have movie data and ID
                if (!movieData || !movieData.id) return;

                let unique_id = (movieData.name ? 'tv_' : 'movie_') + movieData.id;
                let logoMaxHeight = '125px'; // Size for full screen

                // 1. Check Cache
                if (window.shared_logo_cache.hasOwnProperty(unique_id)) {
                    let cached_data = window.shared_logo_cache[unique_id];
                    if (cached_data && cached_data !== 'not_found') {
                        targetElement$.html(cached_data);
                    }
                    // If 'not_found', Lampa should show its default text title.
                    return;
                }

                // 2. Fetch Logo (if not cached)
                let item_id = movieData.id;
                 let method = movieData.method || (movieData.name ? 'tv' : 'movie');
                let api_path = (method === 'tv' ? `tv/${item_id}/images` : `movie/${item_id}/images`);
                let api_url = Lampa.TMDB.api(api_path + "?api_key=" + Lampa.TMDB.key() + "&language=" + Lampa.Storage.get("language"));

                $.get(api_url, function(response) {
                    let logo_url = null;
                    let logo_path = null;
                    if (response.logos && response.logos.length > 0) {
                        logo_path = response.logos[0].file_path;
                    }
                    if (logo_path) {
                        logo_url = Lampa.TMDB.image("/t/p/w300" + logo_path.replace(".svg", ".png"));
                        let img_html = `<img class="plugin-logo-full" style="max-height: ${logoMaxHeight}; width: auto; max-width: 95%; display: block; margin: 5px auto 0 auto;" src="${logo_url}" alt="Logo"/>`;
                        targetElement$.html(img_html);
                        window.shared_logo_cache[unique_id] = img_html;
                    } else {
                        window.shared_logo_cache[unique_id] = 'not_found';
                    }
                }).fail(function() {
                    console.error("MovieLogo FullScreen: API call failed for logo", unique_id);
                    window.shared_logo_cache[unique_id] = 'not_found';
                });

            }); // End Lampa.Listener.follow("full")
        } // End fullscreen listener guard
        // *** END NEW Full Screen Listener ***

    } // End startPlugin function

    // Original check before starting (Unchanged)
    if (!window.plugin_interface_ready) startPlugin();

})(); // End Main IIFE
