// == New Version | Better Menu | Cleaned and Wroking ==
(function () {
    'use strict';
    
    // --- Fetcher Configuration ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', // Base URL for MDBList TMDB endpoint
        // api_key is now configured via Lampa Settings -> Additional Ratings
        cache_time: 60 * 60 * 12 * 1000, // 12 hours cache duration
        cache_key: 'mdblist_ratings_cache', // Unique storage key for ratings data
        cache_limit: 500, // Max items in cache
        request_timeout: 10000 // 10 seconds request timeout
    };
    
    // --- Language Strings ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
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
            }          
          
        });
    }


    // --- Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        // 1. Add the new Settings Category
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>' // Simple placeholder icon
        });

        // 2. Add the API Key parameter under the new category
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', // <-- Target the new component
            param: {
                name: 'mdblist_api_key', // Storage key for the API key
                type: 'input',          // Input field type
                'default': '',          // Default value (empty)
                values: {},             // Keep this from previous attempt, just in case
                placeholder: 'Enter your MDBList API Key' // Placeholder text
            },
            field: {
                name: 'MDBList API Key', // Display name in settings
                description: Lampa.Lang.translate('mdblist_api_key_desc') // Use translated description
            },
            onChange: function() {
                // Optional: Clear cache if API key changes? For now, just update settings.
                Lampa.Settings.update();
            }
        });

        // 3. Add Button to Open Rating Selection
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', // Target category
            param: {
                name: 'select_ratings_button', // Unique name for this settings parameter
                type: 'button'                 // Set type to button
            },
            field: {
                // Use translated text for the button row
                name: Lampa.Lang.translate('select_ratings_button_name'),
                description: Lampa.Lang.translate('select_ratings_button_desc')
            },
            // onChange for button type = action on click/enter
            onChange: function () {
                // Call our helper function to show the selection dialog
                showRatingProviderSelection();
            }
        });

    } else {
        console.error("MDBLIST_Fetcher: Lampa.SettingsApi not available. Cannot create API Key setting.");
    }

    // --- Network Instance ---
    // Use Lampa.Reguest if available for consistency and potential benefits
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions ---
    function getCache(tmdb_id) {
        // Ensure Lampa Storage is available for caching
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); // Use Lampa's cache utility

        if (cache[tmdb_id]) {
            // Check if cache entry has expired
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache); // Update storage after removing expired entry
                return false;
            } 
          return cache[tmdb_id].data; // Return cached data { imdb: ..., tmdb: ..., etc... }
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        // Ensure Lampa Storage is available
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        // Store data along with a timestamp
        cache[tmdb_id] = {
            timestamp: timestamp,
            data: data
        };
        Lampa.Storage.set(config.cache_key, cache); // Save updated cache to storage
      }

    // --- Core Fetching Logic ---
    /**
     * Fetches ratings for a given movie/show from MDBList.
     * @param {object} movieData - Object containing movie details. Requires 'id' (TMDB ID) and 'method' ('movie' or 'tv').
     * @param {function} callback - Function to call with the result object (e.g., {imdb: 7.5, tmdb: 8.0, error: null}) or error ({error: 'message'}).
     */
    function fetchRatings(movieData, callback) {
        // Check if Lampa components are available
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

        // Validate input data
        if (!movieData || !movieData.id || !movieData.method || !callback) {
             console.error("MDBLIST_Fetcher: Invalid input - requires movieData object with 'id' and 'method' ('movie'/'tv'), and a callback function.");
             if (callback) callback({ error: "Invalid input data" });
             return;
        }

        var tmdb_id = movieData.id;

        // 1. Check Cache
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) {
            // If valid cache exists, return it immediately via callback
            callback(cached_ratings);
            return;
        }

        // 2. Get API Key from Storage
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) {
            // No need to cache this error, as it depends on user config
            // Updated error message to reflect 'Additional Ratings' section
            callback({ error: "MDBList API Key not configured in Additional Ratings settings" });
            return;
        }

        // 3. Prepare API Request
        // MDBList uses 'show' for TV series
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        // Construct URL using the retrieved API key
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);

        
        // 4. Make Network Request using Lampa.Request
        network.clear(); // Clear previous requests on this instance
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            // --- Success Callback ---
            var ratingsResult = { error: null }; // Initialize result object

            if (response && response.ratings && Array.isArray(response.ratings)) {
                 // Populate result object dynamically from the ratings array
                 response.ratings.forEach(function(rating) {
                     // Use source name directly as key, only if value is not null
                     if (rating.source && rating.value !== null) {
                          ratingsResult[rating.source] = rating.value;
                     }
                 });
            } else if (response && response.error) {
                // Handle specific errors from MDBList API (e.g., invalid key)
                console.error("MDBLIST_Fetcher: API Error from MDBList for TMDB ID:", tmdb_id, response.error);
                ratingsResult.error = "MDBList API Error: " + response.error;
            }
             else {
                 console.error("MDBLIST_Fetcher: Invalid response format received from MDBList for TMDB ID:", tmdb_id, response);
                 ratingsResult.error = "Invalid response format from MDBList";
            }

            // Cache the processed result (even if it's just {error: ...})
            // Only cache successful results or non-auth related errors
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setCache(tmdb_id, ratingsResult);
            }
            // Execute the original callback with the result
            callback(ratingsResult);

        }, function (xhr, status) {
            // --- Error Callback ---
            var errorMessage = "MDBList request failed";
            if (status) { errorMessage += " (Status: " + status + ")"; }
            // Avoid logging the full URL which contains the API key
            console.error("MDBLIST_Fetcher:", errorMessage, "for TMDB ID:", tmdb_id);

            var errorResult = { error: errorMessage };

            // Cache the error state to prevent rapid retries on persistent failures
            // Avoid caching auth-related errors (like 401 Unauthorized) caused by bad keys
            if (status !== 401 && status !== 403) {
                setCache(tmdb_id, errorResult);
            }
            // Execute the original callback with the error result
            callback(errorResult);
        }); // End network.silent
    } // End fetchRatings

    // --- MDBList Fetcher State ---
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};
    // -----------------------------


    // Function to display the multi-select dialog for rating providers
    function showRatingProviderSelection() {
        // Define the available rating providers
        // 'id' MUST match the Lampa.Storage key used by create.draw (e.g., 'show_rating_imdb')
        // 'default' MUST match the default value defined for the original trigger
        const providers = [
            { title: 'IMDb', id: 'show_rating_imdb', default: true },
            { title: 'TMDB', id: 'show_rating_tmdb', default: true },
            // { title: 'KinoPoisk', id: 'show_rating_kp', default: true }, // 
            { title: 'Rotten Tomatoes (Critics)', id: 'show_rating_tomatoes', default: false },
            { title: 'Rotten Tomatoes (Audience)', id: 'show_rating_audience', default: false },
            { title: 'Metacritic', id: 'show_rating_metacritic', default: false },
            { title: 'Trakt', id: 'show_rating_trakt', default: false },
            { title: 'Letterboxd', id: 'show_rating_letterboxd', default: false },
            { title: 'Roger Ebert', id: 'show_rating_rogerebert', default: false }
        ];

        // Prepare items array for Lampa.Select.show
        let selectItems = providers.map(provider => {
            let storedValue = Lampa.Storage.get(provider.id, provider.default);
            let isChecked = (storedValue === true || storedValue === 'true');
            return {
                title: provider.title,
                id: provider.id,          // Use the storage key as the item ID
                checkbox: true,         // Display as a checkbox
                checked: isChecked,       // Set initial state based on storage
                default: provider.default // Pass default for toggle logic in onCheck
            };
        });

        // Get current controller context to return correctly with 'Back'
        var currentController = Lampa.Controller.enabled().name;

        // Use Lampa's built-in Select component
        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), // Translated title
            items: selectItems,                                        // Items with checkboxes
            onBack: function () {                                      // Handler for Back button
                Lampa.Controller.toggle(currentController || 'settings');
            },
            onCheck: function (item) { // Handler for when ANY checkbox is toggled
                // Read the definitive OLD state from storage using item's ID
                let oldValue = Lampa.Storage.get(item.id, item.default);
                let oldStateIsChecked = (oldValue === true || oldValue === 'true');

                // Calculate the NEW state
                let newStateIsChecked = !oldStateIsChecked;

                // Save the NEW state directly to Lampa.Storage under the specific key (e.g., 'show_rating_imdb')
                Lampa.Storage.set(item.id, newStateIsChecked);

                // Update the visual state of the checkbox in the dialog UI
                item.checked = newStateIsChecked;

                // NOTE: We don't call Lampa.Settings.update() here. We're saving directly.
                // The draw function will read these storage keys next time it runs.
            }
        });
    } // End of showRatingProviderSelection function
  
    // --- create function (Info Panel Handler) ---
    // UNCHANGED create function...
    function create() { var html; var timer; var network = new Lampa.Reguest(); var loaded = {}; this.create = function () { html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>"); }; this.update = function (data) { var _this = this; html.find('.new-interface-info__head,.new-interface-info__details').text('---'); html.find('.new-interface-info__title').text(data.title); html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200')); delete mdblistRatingsCache[data.id]; delete mdblistRatingsPending[data.id];  if (/*window.MDBLIST_Fetcher && typeof window.MDBLIST_Fetcher.fetch === 'function' && */data.id && data.method) { mdblistRatingsPending[data.id] = true; /*window.MDBLIST_Fetcher.fetch*/fetchRatings(data, function(mdblistResult) { mdblistRatingsCache[data.id] = mdblistResult; delete mdblistRatingsPending[data.id]; var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (loaded[tmdb_url]) { _this.draw(loaded[tmdb_url]); } }); } else if (!data.method) { /* Optional warning */ } this.load(data); };
     this.draw = function (data) {
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [];
            // ** Initialize separate arrays for layout lines **
            var lineOneDetails = []; // To hold Ratings, Runtime, PG
            var genreDetails = [];   // To hold only Genres string
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            // --- Logo URLs --- (Unchanged - keep all)
            const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
            const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
            const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
            const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';
            const rtAudienceFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_positive_audience.svg';
            const rtAudienceSpilledLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_negative_audience.svg';
            const metacriticLogoUrl = 'https://psahx.github.io/ps_plug/Metacritic_M.png';
            const traktLogoUrl = 'https://psahx.github.io/ps_plug/Trakt.svg';
            const letterboxdLogoUrl = 'https://psahx.github.io/ps_plug/letterboxd-decal-dots-pos-rgb.svg';
            const rogerEbertLogoUrl = 'https://psahx.github.io/ps_plug/Roger_Ebert.jpeg';
            const kpLogoUrl = 'https://psahx.github.io/ps_plug/kinopoisk-icon-main.svg'; // Unused

            // --- Rating Toggles State --- (Unchanged - read all needed for line 1)
            let imdbStored = Lampa.Storage.get('show_rating_imdb', true);
            const showImdb = (imdbStored === true || imdbStored === 'true');
            let tmdbStored = Lampa.Storage.get('show_rating_tmdb', true);
            const showTmdb = (tmdbStored === true || tmdbStored === 'true');
            // No need to read KP toggle anymore
            let tomatoesStored = Lampa.Storage.get('show_rating_tomatoes', false);
            const showTomatoes = (tomatoesStored === true || tomatoesStored === 'true');
            let audienceStored = Lampa.Storage.get('show_rating_audience', false);
            const showAudience = (audienceStored === true || audienceStored === 'true');
            let metacriticStored = Lampa.Storage.get('show_rating_metacritic', false);
            const showMetacritic = (metacriticStored === true || metacriticStored === 'true');
            let traktStored = Lampa.Storage.get('show_rating_trakt', false);
            const showTrakt = (traktStored === true || traktStored === 'true');
            let letterboxdStored = Lampa.Storage.get('show_rating_letterboxd', false);
            const showLetterboxd = (letterboxdStored === true || letterboxdStored === 'true');
            let rogerEbertStored = Lampa.Storage.get('show_rating_rogerebert', false);
            const showRogerebert = (rogerEbertStored === true || rogerEbertStored === 'true');

            // --- Build Head --- (Unchanged)
            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // --- Get MDBList Rating Results --- (Unchanged)
            var mdblistResult = mdblistRatingsCache[data.id];

            // --- Build Line 1 Details (Ratings) ---
            // Push all active rating divs into lineOneDetails
            if (showImdb) {
                var imdbRating = mdblistResult && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number' ? parseFloat(mdblistResult.imdb || 0).toFixed(1) : '0.0';
                lineOneDetails.push('<div class="full-start__rate imdb-rating-item">' + '<div>' + imdbRating + '</div>' + '<img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false">' + '</div>');
            }
            if (showTmdb) {
                lineOneDetails.push('<div class="full-start__rate tmdb-rating-item">' + '<div>' + vote + '</div>' + '<img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false">' + '</div>');
            }
            if (showTomatoes) {
                 if (mdblistResult && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { lineOneDetails.push('<div class="full-start__rate rt-rating-item">' + '<div class="rt-score">' + score + '</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Critics" draggable="false">' + '</div>'); } }
            }
            if (showAudience) {
                 if (mdblistResult && mdblistResult.popcorn != null) { let parsedScore = parseFloat(mdblistResult.popcorn); if (!isNaN(parsedScore)) { let score = parsedScore; let logoUrl = ''; if (score >= 60) { logoUrl = rtAudienceFreshLogoUrl; } else if (score >= 0) { logoUrl = rtAudienceSpilledLogoUrl; } if (logoUrl) { lineOneDetails.push('<div class="full-start__rate rt-audience-rating-item">' + '<div class="rt-audience-score">' + score + '</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-audience-logo" alt="RT Audience" draggable="false">' + '</div>'); } } }
            }
            if (showMetacritic) {
                 if (mdblistResult && typeof mdblistResult.metacritic === 'number' && mdblistResult.metacritic !== null) { let score = mdblistResult.metacritic; if (score >= 0) { lineOneDetails.push('<div class="full-start__rate metacritic-rating-item">' + '<div class="metacritic-score">' + score + '</div>' + '<img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" alt="Metacritic" draggable="false">' + '</div>'); } }
            }
            if (showTrakt) {
                 if (mdblistResult && mdblistResult.trakt != null) { let parsedScore = parseFloat(mdblistResult.trakt); if (!isNaN(parsedScore)) { let score = parsedScore; if (score >= 0) { lineOneDetails.push('<div class="full-start__rate trakt-rating-item">' + '<div class="trakt-score">' + score + '</div>' + '<img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" alt="Trakt" draggable="false">' + '</div>'); } } }
            }
            if (showLetterboxd) {
                 if (mdblistResult && mdblistResult.letterboxd != null) { let parsedScore = parseFloat(mdblistResult.letterboxd); if (!isNaN(parsedScore)) { let score = parsedScore.toFixed(1); if (parsedScore >= 0) { lineOneDetails.push('<div class="full-start__rate letterboxd-rating-item">' + '<div class="letterboxd-score">' + score + '</div>' + '<img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" alt="Letterboxd" draggable="false">' + '</div>'); } } }
            }
            if (showRogerebert) {
                 if (mdblistResult && mdblistResult.rogerebert != null) { let parsedScore = parseFloat(mdblistResult.rogerebert); if (!isNaN(parsedScore)) { let score = parsedScore.toFixed(1); if (parsedScore >= 0) { lineOneDetails.push('<div class="full-start__rate rogerebert-rating-item">' + '<div class="rogerebert-score">' + score + '</div>' + '<img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" alt="Roger Ebert" draggable="false">' + '</div>'); } } }
            }


            // --- Build Line 1 Details (Runtime, PG) ---
            // Push Runtime and PG into lineOneDetails array
            if (data.runtime) {
                lineOneDetails.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            }
            if (pg) {
                lineOneDetails.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');
            }

            // --- Build Genre Details ---
            // Push ONLY the Genres string into genreDetails array
            if (data.genres && data.genres.length > 0) {
                genreDetails.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | '));
            }

            // --- Update HTML ---
            html.find('.new-interface-info__head').empty().append(head.join(', '));

            // ** Construct final details HTML with specific lines **
            let lineOneHtml = lineOneDetails.join('<span class="new-interface-info__split">&#9679;</span>');
            // Genres string is already joined by '|', so just get the first element if it exists
            let genresHtml = genreDetails.length > 0 ? genreDetails[0] : '';

            let finalDetailsHtml = '';
            // Add line 1 (Ratings, Runtime, PG) if it has content
            if (lineOneDetails.length > 0) {
                 finalDetailsHtml += `<div class="line-one-details">${lineOneHtml}</div>`;
            }
            // Add line 2 (Genres) if it has content
             if (genresHtml) {
                 finalDetailsHtml += `<div class="genre-details-line">${genresHtml}</div>`;
             }

            // Set the new HTML structure into the details element
            html.find('.new-interface-info__details').html(finalDetailsHtml);
        }; // End draw function
                       
        this.load = function (data) { /* UNCHANGED load function */ var _this = this; clearTimeout(timer); var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (loaded[url]) return this.draw(loaded[url]); timer = setTimeout(function () { network.clear(); network.timeout(5000); network.silent(url, function (movie) { loaded[url] = movie; if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; _this.draw(movie); }); }, 300); };
        this.render = function () { return html; }; this.empty = function () {};
        this.destroy = function () { /* UNCHANGED destroy function */ html.remove(); loaded = {}; html = null; mdblistRatingsCache = {}; mdblistRatingsPending = {}; };
    }


    // --- component function (Main List Handler) ---
    // ORIGINAL FUNCTION - UNCHANGED
    function component(object) { var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer; this.create = function () {}; this.empty = function () { /* Original empty code */ var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); html.append(empty.render(button)); this.start = empty.start; this.activity.loader(false); this.activity.toggle(); }; this.loadNext = function () { /* Original loadNext code */ var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; new_data.forEach(_this.append.bind(_this)); Lampa.Layer.visible(items[active + 1].render(true)); }, function () { _this.next_wait = false; }); } }; this.push = function () {}; this.build = function (data) { /* Original build code */ var _this2 = this; lezydata = data; info = new create(object); info.create(); scroll.minus(info.render()); data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); html.append(info.render()); html.append(scroll.render()); if (newlampa) { /* Original newlampa code */ Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; } if (items.length > 0 && items[0] && items[0].data) { active = 0; info.update(items[active].data); this.background(items[active].data); } this.activity.loader(false); this.activity.toggle(); }; this.background = function (elem) { /* Original background code */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (new_background == background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); }, 1000); }; this.append = function (element) { /* Original append code */ if (element.ready) return; var _this3 = this; element.ready = true; var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore }); item.create(); item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this); item.onToggle = function () { active = items.indexOf(item); }; if (this.onMore) item.onMore = this.onMore.bind(this); item.onFocus = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; item.onHover = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; info.update(elem); _this3.background(elem); }; item.onFocusMore = info.empty.bind(info); scroll.append(item.render()); items.push(item); }; this.back = function () { Lampa.Activity.backward(); }; this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); }; this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } }; this.start = function () { /* Original start code */ var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, back: this.back }); Lampa.Controller.toggle('content'); }; this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; }; this.pause = function () {}; this.stop = function () {}; this.render = function () { return html; }; this.destroy = function () { /* Original destroy code */ clearTimeout(background_timer); network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); if (html) html.remove(); items = null; network = null; lezydata = null; info = null; html = null; }; }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        // UNCHANGED Initialization setup...
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { console.error("NewInterface Adjust Padding: Missing Lampa components"); return; }
        Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
        window.plugin_interface_ready = true; var old_interface = Lampa.InteractionMain; var new_interface = component;
        Lampa.InteractionMain = function (object) { var use = new_interface; if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; if (window.innerWidth < 767) use = old_interface; if (!Lampa.Account.hasPremium()) use = old_interface; if (Lampa.Manifest.app_digital < 153) use = old_interface; return new use(object); };

        // **MODIFIED CSS**: Adjusted padding for number divs
        var style_id = 'new_interface_style_adjusted_padding'; // Style ID
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove(); // Clean up previous

            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            /* Base styles... (kept from pivot point script) */
            .new-interface .card--small.card--wide { width: 18.3em; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; } /* original was 24em*/
            /* ... rest of base styles identical to pivot script ... */
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
            /* .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; } */
                        
            .new-interface-info__details {
                margin-bottom: 1em; 
                display: block;
                min-height: 1.9em;
                font-size: 1.1em;
            }
            .line-one-details {
                margin-bottom: 0.6em;
                line-height: 1.5;
            }
            .genre-details-line {
                margin-top: 1em;
                line-height: 1.5;
            }

            .new-interface-info__split { margin: 0 0.7em; font-size: 0.7em; }
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


            /* --- Rating Box Styles --- */
            .new-interface .full-start__rate {
                font-size: 1.3em;        /* Lampa Source base size is 1.3, we had it 1.45 */
                margin-right: 0em;        /* modified was 1em */
                display: inline-flex;
                align-items: center;
                vertical-align: middle;
                background-color: rgba(255, 255, 255, 0.12); /* Light wrapper background */
                padding: 0 0.2em 0 0; /* Zero Left Padding */
                border-radius: 0.3em;  /* Smoother edges */
                gap: 0.4em; /* modified was 0.5 */
                overflow: hidden;
                height: auto;
            }
            /* Style for the Number Div (common to all ratings) */
            .new-interface .full-start__rate > div {
                font-weight: normal;      /* Normal weight */
                font-size: 0.9em;         /* Changing back to original from 0.9 */
                justify-content: center;  /* From source analysis */
                background-color: rgba(0, 0, 0, 0.4); /* Darker background */
                color: #ffffff;
                padding: 0em 0.2em;     /* ** MODIFIED: Narrower L/R padding (was 0.3em) ** */
                border-radius: 0.3em;       /* Smoother edges */
                line-height: 1;          /* MODIFIED: Was 1.3 */
                order: 1;
                display: flex;
                align-items: center;
                flex-shrink: 0;
            }
         
            /* General Logo Style - UNCHANGED from pivot point */
            .rating-logo {
                height: 1.1em;
                width: auto;
                max-width: 75px; /* changed from 55 */
                vertical-align: middle;
                order: 2;
                line-height: 0;
            }
             /* Specific Logo Adjustments - UNCHANGED from pivot point */
            .tmdb-logo { height: 0.9em; }
            .rt-logo { height: 1.1em; }
            /* --- End Rating Box Styles --- */

            </style>
            `);
          $('body').append(Lampa.Template.get(style_id, {}, true));
        }
    }

    // Original check before starting
    if (!window.plugin_interface_ready) startPlugin();

})();
