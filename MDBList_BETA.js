// == Version 2.1.0 | Watchmode Quality + Debug Logging ==
(function () {
    'use strict';

    // --- Fetcher Configuration (MDBList) ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', // Base URL for MDBList TMDB endpoint
        cache_time: 60 * 60 * 12 * 1000, // 12 hours cache duration
        cache_key: 'mdblist_ratings_cache', // Unique storage key for ratings data
        cache_limit: 500, // Max items in cache
        request_timeout: 10000 // 10 seconds request timeout
    };

    // --- Watchmode Fetcher State & Config ---
    var watchmodeCache = {}; // Cache for full Watchmode details responses
    var watchmodePending = {}; // Tracks pending Watchmode requests
    var watchmode_cache_key = 'watchmode_details_cache'; // Unique key
    var watchmode_cache_time = 24 * 60 * 60 * 1000; // 24 hours cache
    var watchmode_request_timeout = 15000; // Watchmode might be slower? Use 15s.
    var watchmode_api_base_url = 'https://api.watchmode.com/v1/title/'; // Base URL for title details


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
            },
            // Watchmode keys
            watchmode_api_key_desc: {
                 en: "Required for Quality/Streaming info. Get free key: api.watchmode.com/requestApiKey/",
                 ru: "Требуется для инфо о качестве/стриминге. Бесплатный ключ: api.watchmode.com/requestApiKey/",
                 uk: "Потрібен для інфо про якість/стрімінг. Безкоштовний ключ: api.watchmode.com/requestApiKey/"
            },
            ar_show_quality_name: {
                 en: "Show Quality Label",
                 ru: "Показывать Метку Качества",
                 uk: "Показувати Мітку Якості"
            },
            ar_show_quality_desc: {
                 en: "Displays highest available streaming quality (4K, HD, SD) from Watchmode on posters/cards.",
                 ru: "Отображает наивысшее доступное качество стриминга (4K, HD, SD) из Watchmode на постере/карточке.",
                 uk: "Відображає найвищу доступну якість стрімінгу (4K, HD, SD) з Watchmode на постері/картці."
            }
        });
    }


    // --- Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' },
            field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

        // Add the Watchmode API Key parameter (Corrected)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'watchmode_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your Watchmode API Key' },
            field: { name: 'Watchmode API Key', description: Lampa.Lang.translate('watchmode_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

        // Add Button to Open Rating Selection
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'select_ratings_button', type: 'button' },
            field: { name: Lampa.Lang.translate('select_ratings_button_name'), description: Lampa.Lang.translate('select_ratings_button_desc') },
            onChange: function () { showRatingProviderSelection(); }
        });

        // Add Toggle for Watchmode Quality Label
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'ar_show_quality', type: 'trigger', 'default': false },
            field: { name: Lampa.Lang.translate('ar_show_quality_name'), description: Lampa.Lang.translate('ar_show_quality_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

    } else {
        console.error("AR_Plugin: Lampa.SettingsApi not available.");
    }

    // --- Network Instance ---
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions (MDBList) ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id]; Lampa.Storage.set(config.cache_key, cache); return false;
            }
          return cache[tmdb_id].data;
        } return false;
    }
    function setCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        cache[tmdb_id] = { timestamp: timestamp, data: data };
        Lampa.Storage.set(config.cache_key, cache);
    }

    // --- Watchmode Caching Functions ---
    function getWatchmodeCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(watchmode_cache_key, config.cache_limit, {});
        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > watchmode_cache_time) {
                delete cache[tmdb_id]; Lampa.Storage.set(watchmode_cache_key, cache); return false;
            }
          return cache[tmdb_id].data; // Returns { data: { ... }, error: ... }
        } return false;
    }
    function setWatchmodeCache(tmdb_id, result) { // result is { data: ..., error: ... }
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(watchmode_cache_key, config.cache_limit, {});
        cache[tmdb_id] = { timestamp: timestamp, data: result };
        Lampa.Storage.set(watchmode_cache_key, cache);
    }


    // --- Core Fetching Logic (MDBList) ---
    function fetchRatings(movieData, callback) {
        if (!network) { if (callback) callback({ error: "Network component unavailable" }); return; }
        if (!window.Lampa || !Lampa.Storage) { if (callback) callback({ error: "Storage component unavailable" }); return; }
        if (!movieData || !movieData.id || !movieData.method || !callback) { if (callback) callback({ error: "Invalid input data" }); return; }
        var tmdb_id = movieData.id;
        var cached_ratings = getCache(tmdb_id); if (cached_ratings) { callback(cached_ratings); return; }
        var apiKey = Lampa.Storage.get('mdblist_api_key'); if (!apiKey) { callback({ error: "MDBList API Key not configured" }); return; }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);
        network.clear(); network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            var ratingsResult = { error: null };
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) { if (rating.source && rating.value !== null) { ratingsResult[rating.source] = rating.value; } });
            } else if (response && response.error) { ratingsResult.error = "MDBList API Error: " + response.error; console.error("MDBList_Fetcher: API Error", tmdb_id, response.error); }
            else { ratingsResult.error = "Invalid response format from MDBList"; console.error("MDBList_Fetcher: Invalid response", tmdb_id, response); }
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) { setCache(tmdb_id, ratingsResult); }
            callback(ratingsResult);
        }, function (xhr, status) {
            var errorMessage = "MDBList request failed"; if (status) { errorMessage += " (Status: " + status + ")"; } console.error("MDBLIST_Fetcher:", errorMessage, "for TMDB ID:", tmdb_id);
            var errorResult = { error: errorMessage }; if (status !== 401 && status !== 403) { setCache(tmdb_id, errorResult); } callback(errorResult);
        });
    } // End fetchRatings


    // --- Watchmode Fetching Logic ---
    function fetchWatchmodeDetails(movieData, callback) {
        if (!network || !window.Lampa || !Lampa.Storage) { console.error("Watchmode_Fetcher: Missing Lampa component."); if (callback) callback({ data: null, error: "Lampa component missing" }); return; }
        if (!movieData || !movieData.id || !movieData.imdb_id || !callback) { if (callback) callback({ data: null, error: (movieData && movieData.id && !movieData.imdb_id) ? "IMDb ID missing for Watchmode lookup" : "Invalid input data for Watchmode" }); return; }
        var tmdb_id = movieData.id; var imdb_id = movieData.imdb_id;
        var cached_data = getWatchmodeCache(tmdb_id); if (cached_data) { callback(cached_data); return; }
        if (watchmodePending[tmdb_id]) { return; } watchmodePending[tmdb_id] = true;
        var apiKey = Lampa.Storage.get('watchmode_api_key');
        if (!apiKey) { delete watchmodePending[tmdb_id]; if (callback) callback({ data: null, error: "Watchmode API Key not configured" }); return; }
        var api_url = watchmode_api_base_url + imdb_id + '/details/?apiKey=' + apiKey;
        network.clear(); network.timeout(watchmode_request_timeout);
        network.silent(api_url, function (response) { // onSuccess
            var watchmodeResult = { data: null, error: null };
            if (response && response.id) { watchmodeResult.data = response; }
            else if (response && response.success === false && response.message) { watchmodeResult.error = "Watchmode API Error: " + response.message; console.error("Watchmode_Fetcher: API Error for IMDb ID:", imdb_id, response.message); }
            else { watchmodeResult.error = "Invalid response from Watchmode"; console.error("Watchmode_Fetcher: Invalid response for IMDb ID:", imdb_id, response); }
            setWatchmodeCache(tmdb_id, watchmodeResult); delete watchmodePending[tmdb_id]; callback(watchmodeResult);
        }, function (xhr, status) { // onError
            var errorMessage = "Watchmode request failed";
            if (status === 404) { errorMessage = "Title not found on Watchmode (404)"; }
            else if (status === 401) { errorMessage = "Watchmode API Key Invalid (401)"; }
            else if (status === 403) { errorMessage = "Watchmode API Forbidden (403)"; }
            else if (status === 429) { errorMessage = "Watchmode Rate Limit Exceeded (429)"; }
            else if (status) { errorMessage += " (Status: " + status + ")"; }
            console.error("Watchmode_Fetcher:", errorMessage, "for IMDb ID:", imdb_id);
            var errorResult = { data: null, error: errorMessage };
            if (status !== 401 && status !== 403 && status !== 429) { setWatchmodeCache(tmdb_id, errorResult); }
            delete watchmodePending[tmdb_id]; callback(errorResult);
        });
    } // End fetchWatchmodeDetails


    // --- MDBList Fetcher State ---
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};
    // --- (Watchmode cache/pending defined earlier) ---


    // --- Helper Functions ---
    /** Appends Quality Label */
    function appendQualityElement(qualityString, selector) {
        console.log('[AR Quality Debug] appendQualityElement: Attempting to append "' + qualityString + '" to selector:', selector); // LOG APPEND CALL
        if (!qualityString || !selector) { console.log('[AR Quality Debug] appendQualityElement: Missing qualityString or selector.'); return; }
        try {
            var parentElement = (typeof selector === 'string') ? $(selector) : selector;
            if (parentElement.length) {
                console.log('[AR Quality Debug] appendQualityElement: Parent element found.'); // LOG PARENT FOUND
                parentElement.find('.card__quality').remove();
                var qualityDiv = $('<div></div>').addClass('card__quality').text(qualityString);
                parentElement.append(qualityDiv);
                console.log('[AR Quality Debug] appendQualityElement: Successfully appended.'); // LOG SUCCESS
            } else {
                console.log('[AR Quality Debug] appendQualityElement: Parent element NOT found for selector:', selector); // LOG PARENT NOT FOUND
            }
        } catch (e) { console.error("AR_Plugin Quality: Error appending element", e); }
    }
    /** Parses Watchmode data for Quality Label */
    function displayQualityLabel(watchmodeData, selector) {
        console.log('[AR Quality Debug] displayQualityLabel called for selector:', selector); // LOG FUNCTION CALL
        if (!watchmodeData || !watchmodeData.sources || !Array.isArray(watchmodeData.sources)) { console.log('[AR Quality Debug] displayQualityLabel: Exiting - No valid sources data.'); return; }
        console.log('[AR Quality Debug] displayQualityLabel: Sources data:', JSON.stringify(watchmodeData.sources)); // LOG SOURCES
        let bestFormat = null; const qualityOrder = ["4K", "HD", "SD"];
        for (const quality of qualityOrder) { if (watchmodeData.sources.some(source => source.format === quality)) { bestFormat = quality; break; } }
        console.log('[AR Quality Debug] displayQualityLabel: Determined best format:', bestFormat); // LOG BEST FORMAT
        if (bestFormat) { appendQualityElement(bestFormat, selector); }
        else { console.log('[AR Quality Debug] displayQualityLabel: No suitable format (4K/HD/SD) found.'); } // LOG NO FORMAT FOUND
    }
    /** Shows Rating Provider Selection Dialog */
    function showRatingProviderSelection() {
        const providers = [ { title: 'IMDb', id: 'show_rating_imdb', default: true }, { title: 'TMDB', id: 'show_rating_tmdb', default: true }, { title: 'Rotten Tomatoes (Critics)', id: 'show_rating_tomatoes', default: false }, { title: 'Rotten Tomatoes (Audience)', id: 'show_rating_audience', default: false }, { title: 'Metacritic', id: 'show_rating_metacritic', default: false }, { title: 'Trakt', id: 'show_rating_trakt', default: false }, { title: 'Letterboxd', id: 'show_rating_letterboxd', default: false }, { title: 'Roger Ebert', id: 'show_rating_rogerebert', default: false } ];
        let selectItems = providers.map(provider => { let storedValue = Lampa.Storage.get(provider.id, provider.default); let isChecked = (storedValue === true || storedValue === 'true'); return { title: provider.title, id: provider.id, checkbox: true, checked: isChecked, default: provider.default }; });
        var currentController = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), items: selectItems,
            onBack: function () { Lampa.Controller.toggle(currentController || 'settings'); },
            onCheck: function (item) { let oldValue = Lampa.Storage.get(item.id, item.default); let oldStateIsChecked = (oldValue === true || oldValue === 'true'); let newStateIsChecked = !oldStateIsChecked; Lampa.Storage.set(item.id, newStateIsChecked); item.checked = newStateIsChecked; }
        });
    } // End showRatingProviderSelection


    // --- create function (Info Panel Handler) ---
    function create() {
        var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
        // Removed this.kpRatingResult = null; as KP was abandoned earlier - keeping state clean

        this.create = function () { html = $("<div class=\"new-interface-info\">\n <div class=\"new-interface-info__body\">\n <div class=\"new-interface-info__head\"></div>\n <div class=\"new-interface-info__title\"></div>\n <div class=\"new-interface-info__details\"></div>\n <div class=\"new-interface-info__description\"></div>\n </div>\n </div>"); };

        // Corrected update function (only triggers MDBList fetch)
        this.update = function (data) {
            var _this = this;
            html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            html.find('.new-interface-info__title').text(data.title);
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
            if (data.id && data.method) {
                var tmdb_url_key = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));
                var mdbCallback = function(mdblistResult) {
                    mdblistRatingsCache[data.id] = mdblistResult;
                    if (loaded && loaded[tmdb_url_key]) { _this.draw(loaded[tmdb_url_key]); }
                };
                fetchRatings(data, mdbCallback);
            } else if (!data.method) { console.warn("CREATE UPDATE: data.method missing for item", data.id); }
            this.load(data); // Triggers TMDB load AND Watchmode fetch (in its callback)
        }; // End update function

        // Draw function (displays MDBList ratings + two-line layout)
        this.draw = function (data) { // data here is the full object from TMDB cache/fetch
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = []; var lineOneDetails = []; var genreDetails = [];
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            // Logos (keep all)
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

            // Rating Toggles State
            let imdbStored = Lampa.Storage.get('show_rating_imdb', true); const showImdb = (imdbStored === true || imdbStored === 'true');
            let tmdbStored = Lampa.Storage.get('show_rating_tmdb', true); const showTmdb = (tmdbStored === true || tmdbStored === 'true');
            let tomatoesStored = Lampa.Storage.get('show_rating_tomatoes', false); const showTomatoes = (tomatoesStored === true || tomatoesStored === 'true');
            let audienceStored = Lampa.Storage.get('show_rating_audience', false); const showAudience = (audienceStored === true || audienceStored === 'true');
            let metacriticStored = Lampa.Storage.get('show_rating_metacritic', false); const showMetacritic = (metacriticStored === true || metacriticStored === 'true');
            let traktStored = Lampa.Storage.get('show_rating_trakt', false); const showTrakt = (traktStored === true || traktStored === 'true');
            let letterboxdStored = Lampa.Storage.get('show_rating_letterboxd', false); const showLetterboxd = (letterboxdStored === true || letterboxdStored === 'true');
            let rogerEbertStored = Lampa.Storage.get('show_rating_rogerebert', false); const showRogerebert = (rogerEbertStored === true || rogerEbertStored === 'true');

            // Build Head
            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // Get MDBList Rating Results
            var mdblistResult = mdblistRatingsCache[data.id];

            // --- Build Line 1 Details (Ratings) ---
            if (showImdb) { var imdbRating = mdblistResult && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number' ? parseFloat(mdblistResult.imdb || 0).toFixed(1) : '0.0'; lineOneDetails.push('<div class="full-start__rate imdb-rating-item">' + '<div>' + imdbRating + '</div>' + '<img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false">' + '</div>'); }
            if (showTmdb) { lineOneDetails.push('<div class="full-start__rate tmdb-rating-item">' + '<div>' + vote + '</div>' + '<img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false">' + '</div>'); }
            if (showTomatoes) { if (mdblistResult && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { lineOneDetails.push('<div class="full-start__rate rt-rating-item">' + '<div class="rt-score">' + score + '</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Critics" draggable="false">' + '</div>'); } } }
            if (showAudience) { if (mdblistResult && mdblistResult.popcorn != null) { let parsedScore = parseFloat(mdblistResult.popcorn); if (!isNaN(parsedScore)) { let score = parsedScore; let logoUrl = ''; if (score >= 60) { logoUrl = rtAudienceFreshLogoUrl; } else if (score >= 0) { logoUrl = rtAudienceSpilledLogoUrl; } if (logoUrl) { lineOneDetails.push('<div class="full-start__rate rt-audience-rating-item">' + '<div class="rt-audience-score">' + score + '</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-audience-logo" alt="RT Audience" draggable="false">' + '</div>'); } } } }
            if (showMetacritic) { if (mdblistResult && typeof mdblistResult.metacritic === 'number' && mdblistResult.metacritic !== null) { let score = mdblistResult.metacritic; if (score >= 0) { lineOneDetails.push('<div class="full-start__rate metacritic-rating-item">' + '<div class="metacritic-score">' + score + '</div>' + '<img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" alt="Metacritic" draggable="false">' + '</div>'); } } }
            if (showTrakt) { if (mdblistResult && mdblistResult.trakt != null) { let parsedScore = parseFloat(mdblistResult.trakt); if (!isNaN(parsedScore)) { let score = parsedScore; if (score >= 0) { lineOneDetails.push('<div class="full-start__rate trakt-rating-item">' + '<div class="trakt-score">' + score + '</div>' + '<img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" alt="Trakt" draggable="false">' + '</div>'); } } } }
            if (showLetterboxd) { if (mdblistResult && mdblistResult.letterboxd != null) { let parsedScore = parseFloat(mdblistResult.letterboxd); if (!isNaN(parsedScore)) { let score = parsedScore.toFixed(1); if (parsedScore >= 0) { lineOneDetails.push('<div class="full-start__rate letterboxd-rating-item">' + '<div class="letterboxd-score">' + score + '</div>' + '<img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" alt="Letterboxd" draggable="false">' + '</div>'); } } } }
            if (showRogerebert) { if (mdblistResult && mdblistResult.rogerebert != null) { let parsedScore = parseFloat(mdblistResult.rogerebert); if (!isNaN(parsedScore)) { let score = parsedScore.toFixed(1); if (parsedScore >= 0) { lineOneDetails.push('<div class="full-start__rate rogerebert-rating-item">' + '<div class="rogerebert-score">' + score + '</div>' + '<img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" alt="Roger Ebert" draggable="false">' + '</div>'); } } } }

            // --- Build Line 1 Details (Runtime, PG) ---
            if (data.runtime) { lineOneDetails.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); }
            if (pg) { lineOneDetails.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }

            // --- Build Genre Details ---
            if (data.genres && data.genres.length > 0) { genreDetails.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); }

            // --- Update HTML ---
            html.find('.new-interface-info__head').empty().append(head.join(', '));
            let lineOneHtml = lineOneDetails.join('<span class="new-interface-info__split">&#9679;</span>');
            let genresHtml = genreDetails.length > 0 ? genreDetails[0] : '';
            let finalDetailsHtml = '';
            if (lineOneDetails.length > 0) { finalDetailsHtml += `<div class="line-one-details">${lineOneHtml}</div>`; }
            if (genresHtml) { finalDetailsHtml += `<div class="genre-details-line">${genresHtml}</div>`; }
            html.find('.new-interface-info__details').html(finalDetailsHtml);
        }; // End draw function

        // Corrected load function (fetches imdb_id, triggers Watchmode fetch)
        this.load = function (data) {
            var _this = this;
            clearTimeout(timer);
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));

            // Callback defined once for Watchmode fetch result
            var watchmodeCallback = function(watchmodeResult) {
                watchmodeCache[data.id] = watchmodeResult;
                if (loaded && loaded[url]) { _this.draw(loaded[url]); }
            };

            if (loaded[url]) {
                 let currentMovieData = loaded[url];
                 _this.draw(currentMovieData);
                 if (!getWatchmodeCache(currentMovieData.id) && !watchmodePending[currentMovieData.id]) {
                      if (currentMovieData.imdb_id){ fetchWatchmodeDetails(currentMovieData, watchmodeCallback); }
                 }
                 return;
            }
            timer = setTimeout(function () {
                network.clear(); network.timeout(5000);
                network.silent(url, function (movie) {
                     movie.imdb_id = movie.external_ids ? movie.external_ids.imdb_id : null;
                     loaded[url] = movie;
                     if (!movie.method) movie.method = data.name ? 'tv' : 'movie';
                     fetchWatchmodeDetails(movie, watchmodeCallback); // Trigger Watchmode Fetch HERE
                     _this.draw(movie); // Initial draw
                }, function(xhr, status){ console.error("CREATE LOAD: Failed to load TMDB details for", data.id, status); });
            }, 300);
        }; // End this.load

        this.render = function () { return html; }; this.empty = function () {};
        // Corrected destroy function (only cleans MDBList vars relevant to this instance)
        this.destroy = function () {
            html.remove(); loaded = {}; html = null;
            mdblistRatingsCache = {}; mdblistRatingsPending = {};
        };
    } // End create function


    // --- component function (Main List Handler) ---
    // ORIGINAL FUNCTION - UNCHANGED
    function component(object) { /* ... */ }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        // Basic Lampa checks
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { console.error("AR_Plugin: Missing Lampa components"); return; }
        // Add lang strings (can be done within the main Lang block)
        Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
        // Interface hijack
        window.plugin_interface_ready = true; var old_interface = Lampa.InteractionMain; var new_interface = component;
        Lampa.InteractionMain = function (object) { var use = new_interface; if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; if (window.innerWidth < 767) use = old_interface; if (!Lampa.Account.hasPremium()) use = old_interface; if (Lampa.Manifest.app_digital < 153) use = old_interface; return new use(object); };

        // CSS Injection
        var style_id = 'ar_style'; // Use specific prefix
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="ar_style"]').remove(); // Clean up previous matching prefix
             $('style[data-id^="new_interface_style_"]').remove(); // Clean up older naming too

            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
                /* Base styles */
                .new-interface .card--small.card--wide { width: 18.3em; }
                .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
                .new-interface-info__body { width: 80%; padding-top: 1.1em; }
                .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
                .new-interface-info__head span { color: #fff; }
                .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
                .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }

                /* Layout for Details */
                .new-interface-info__details { margin-bottom: 1em; display: block; min-height: 1.9em; font-size: 1.1em; }
                .line-one-details { margin-bottom: 0.6em; line-height: 1.5; }
                .genre-details-line { margin-top: 1em; line-height: 1.5; }
                .new-interface-info__split { margin: 0 0.5em; font-size: 0.7em; } /* Split for Line 1 */

                /* Rating Box Styles */
                .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.4em; overflow: hidden; height: auto; }
                .new-interface .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
                .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
                .tmdb-logo { height: 0.9em; }
                .rt-logo { height: 1.1em; }

                /* Quality Label Style */
                .card__quality { position: absolute; top: 0.5em; right: 0.5em; padding: 0.2em 0.5em; background-color: rgba(0, 0, 0, 0.7); color: #fff; font-size: 0.8em; font-weight: bold; border-radius: 0.3em; z-index: 2; line-height: 1.2; pointer-events: none; }

                /* Other Styles */
                .new-interface .card-more__box { padding-bottom: 95%; }
                .new-interface .full-start__background { height: 108%; top: -6em; }
                .new-interface .card__promo { display: none; }
                .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
                .new-interface .card.card--wide .card-watched { display: none !important; }
                body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
                body.light--version .new-interface-info { height: 25.3em; }
                body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
                body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
            </style>
            `);
          $('body').append(Lampa.Template.get(style_id, {}, true));
        }

        // --- Watchmode Quality Listener Setup ---
        let qualityEnabledCheck = Lampa.Storage.get('ar_show_quality', false);
        console.log('[AR Quality Debug] Initial check: Show Quality Enabled?', (qualityEnabledCheck === true || qualityEnabledCheck === 'true')); // LOG START
        if (qualityEnabledCheck === true || qualityEnabledCheck === 'true') {
            if (window.Lampa && Lampa.Listener) {
                Lampa.Listener.follow("full", function (e) {
                    console.log('[AR Quality Debug] "full" listener fired. Type:', e.type); // LOG LISTENER
                    let currentQualityEnabled = Lampa.Storage.get('ar_show_quality', false);
                    if (currentQualityEnabled !== true && currentQualityEnabled !== 'true') { console.log('[AR Quality Debug] "full" listener: Setting disabled, exiting.'); return; } // LOG SETTING OFF
                    if (e.type === "complite" && e.object) {
                        let movieData = e.object;
                        if (movieData && movieData.id) {
                            console.log('[AR Quality Debug] "full" listener: Processing movie ID:', movieData.id, 'IMDb ID:', movieData.imdb_id); // LOG ID
                            let cachedResult = watchmodeCache[movieData.id];
                            console.log('[AR Quality Debug] "full" listener: Cache check for ' + movieData.id + '. Result:', JSON.stringify(cachedResult)); // LOG CACHE RESULT
                            if (cachedResult && cachedResult.data && !cachedResult.error) {
                                let selector = ".full-start-new__poster"; if ($(selector).length == 0) selector = ".full__poster";
                                console.log('[AR Quality Debug] "full" listener: Found valid cache data. Calling displayQualityLabel for selector:', selector); // LOG CALL
                                displayQualityLabel(cachedResult.data, selector);
                            } else { console.log('[AR Quality Debug] "full" listener: No valid cached data found or error present in cache.'); } // LOG NO DATA/ERROR
                        } else { console.log('[AR Quality Debug] "full" listener: Missing movieData or movieData.id'); } // LOG MISSING DATA
                    }
                });
                Lampa.Listener.follow("line", function (e) {
                    // console.log('[AR Quality Debug] "line" listener fired. Type:', e.type); // Can be very verbose
                    let currentQualityEnabled = Lampa.Storage.get('ar_show_quality', false);
                    if (e.type === "append" && (currentQualityEnabled === true || currentQualityEnabled === 'true')) {
                        $.each(e.items, function (_, item) {
                            let movieCard = item.card; let movieData = item.data;
                            if (movieData && movieData.id && movieCard && movieCard.length) {
                                // console.log('[AR Quality Debug] "line" listener: Processing item ID:', movieData.id);
                                let cachedResult = watchmodeCache[movieData.id];
                                // console.log('[AR Quality Debug] "line" listener: Cache result for ' + movieData.id + ':', JSON.stringify(cachedResult));
                                if (cachedResult && cachedResult.data && !cachedResult.error) {
                                     let selector = movieCard.find(".card__view");
                                     if(selector.length){
                                         // console.log('[AR Quality Debug] "line" listener: Calling displayQualityLabel for item ' + movieData.id);
                                         displayQualityLabel(cachedResult.data, selector);
                                     }
                                }
                                // else { console.log('[AR Quality Debug] "line" listener: No cache/error for ' + movieData.id); } // Can be verbose
                            }
                        });
                    }
                });
                 console.log("[AR Quality Debug] Watchmode Quality: Listeners Attached."); // LOG ACTIVATION
            } else { console.error("Watchmode Quality: Lampa.Listener not available."); }
        }
        // --- End Watchmode Quality Listener Setup ---

    } // End startPlugin function

    // Original check before starting
    if (!window.plugin_interface_ready) startPlugin();

})();
