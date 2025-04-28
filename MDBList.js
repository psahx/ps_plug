// == Main Module | Working in order | Merging MDBList ==
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
    // Add description for the settings menu item
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для MDBLIST_Fetcher)",
                en: "Enter your API key from api.mdblist.com (required for MDBLIST_Fetcher)",
                uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для MDBLIST_Fetcher)"
            }
        });
    }

    // --- Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        // 1. Add the new Settings Category
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings', // Internal name for the component
            name: 'Additional Ratings',      // Display name in settings menu
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
                // console.log("MDBLIST_Fetcher: Cache expired for TMDB ID:", tmdb_id);
                return false;
            }
            // console.log("MDBLIST_Fetcher: Cache hit for TMDB ID:", tmdb_id);
            return cache[tmdb_id].data; // Return cached data { imdb: ..., tmdb: ..., etc... }
        }
        // console.log("MDBLIST_Fetcher: Cache miss for TMDB ID:", tmdb_id);
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
        // console.log("MDBLIST_Fetcher: Cached data for TMDB ID:", tmdb_id, data);
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
            // console.error("MDBLIST_Fetcher: MDBList API Key not found in Lampa Storage (Settings > Additional Ratings).");
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

        // console.log("MDBLIST_Fetcher: Fetching from URL:", api_url);

        // 4. Make Network Request using Lampa.Request
        network.clear(); // Clear previous requests on this instance
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            // --- Success Callback ---
            var ratingsResult = { error: null }; // Initialize result object

            if (response && response.ratings && Array.isArray(response.ratings)) {
                 // console.log("MDBLIST_Fetcher: Received ratings array:", response.ratings);
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

    // --- create function (Info Panel Handler) ---
    // UNCHANGED create function...
    function create() { var html; var timer; var network = new Lampa.Reguest(); var loaded = {}; this.create = function () { html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>"); }; this.update = function (data) { var _this = this; html.find('.new-interface-info__head,.new-interface-info__details').text('---'); html.find('.new-interface-info__title').text(data.title); html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200')); delete mdblistRatingsCache[data.id]; delete mdblistRatingsPending[data.id];  if (/*window.MDBLIST_Fetcher && typeof window.MDBLIST_Fetcher.fetch === 'function' && */data.id && data.method) { mdblistRatingsPending[data.id] = true; /*window.MDBLIST_Fetcher.fetch*/fetchRatings(data, function(mdblistResult) { mdblistRatingsCache[data.id] = mdblistResult; delete mdblistRatingsPending[data.id]; var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (loaded[tmdb_url]) { _this.draw(loaded[tmdb_url]); } }); } else if (!data.method) { /* Optional warning */ } this.load(data); };
      this.draw = function (data) { /* UNCHANGED draw function (Number+Logo Order) */ var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var vote = parseFloat((data.vote_average || 0) + '').toFixed(1); var head = []; var details = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data); var pg = Lampa.Api.sources.tmdb.parsePG(data); const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png'; const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg'; const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg'; const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg'; if (create !== '0000') head.push('<span>' + create + '</span>'); if (countries.length > 0) head.push(countries.join(', ')); var mdblistResult = mdblistRatingsCache[data.id]; var imdbRating = mdblistResult && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number' ? parseFloat(mdblistResult.imdb || 0).toFixed(1) : '0.0'; details.push('<div class="full-start__rate imdb-rating-item">' + '<div>' + imdbRating + '</div>' + '<img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false">' + '</div>'); details.push('<div class="full-start__rate tmdb-rating-item">' + '<div>' + vote + '</div>' + '<img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false">' + '</div>'); if (mdblistResult && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { details.push('<div class="full-start__rate rt-rating-item">' + '<div class="rt-score">' + score + '%</div>' + '<img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false">' + '</div>'); } } if (data.genres && data.genres.length > 0) details.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); html.find('.new-interface-info__head').empty().append(head.join(', ')); html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>')); };
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
            .new-interface-info { position: relative; padding: 1.5em; height: 22.5em; } /* original was 24em*/
            /* ... rest of base styles identical to pivot script ... */
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
            .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; }
            .new-interface-info__split { margin: 0 1em; font-size: 0.7em; }
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
                gap: 0.5em; /* modified was 0.3 */
                overflow: hidden;
                height: auto;
            }
            /* Style for the Number Div (common to all ratings) */
            .new-interface .full-start__rate > div {
                font-weight: normal;      /* Normal weight */
                font-size: 1em;         /* Changing back to original from 0.9 */
                justify-content: center;  /* From source analysis */
                background-color: rgba(0, 0, 0, 0.4); /* Darker background */
                color: #ffffff;
                padding: 0.1em 0.3em;     /* ** MODIFIED: Narrower L/R padding (was 0.5em) ** */
                border-radius: 0.3em;       /* Smoother edges */
                line-height: 1.3;
                order: 1;
                display: flex;
                align-items: center;
                flex-shrink: 0;
            }
             /* Specific padding for RT score number div */
             .rt-rating-item > div.rt-score {
                 padding-left: 1.2em;  /* ** MODIFIED: Wider L padding (was 1em) ** */
                 padding-right: 1.2em; /* ** MODIFIED: Wider R padding (was 1em) ** */
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
