// == Combined Version | MDBList Ratings + Movie Logo Toggle (with Logging) ==
(function () {
    'use strict';

    console.log('[Logo Plugin] Initializing...'); // Log plugin start

    // Initialize shared cache for logos
    window.shared_logo_cache = window.shared_logo_cache || {};
    console.log('[Logo Plugin] Shared logo cache initialized:', window.shared_logo_cache);

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
            mdblist_api_key_desc: { ru: "Введите ваш API ключ с сайта MDBList.com", en: "Enter your API key from MDBList.com", uk: "Введіть ваш API ключ з сайту MDBList.com" },
            additional_ratings_title: { ru: "Дополнительные Рейтинги", en: "Additional Ratings", uk: "Додаткові Рейтинги" },
            select_ratings_button_name: { en: "Select Rating Providers", ru: "Выбрать Источники Рейтингов", uk: "Обрати Джерела Рейтингів" },
            select_ratings_button_desc: { en: "Choose which ratings to display", ru: "Выберите, какие рейтинги отображать", uk: "Оберіть, які рейтинги відображати" },
            select_ratings_dialog_title: { en: "Select Ratings", ru: "Выбор Рейтингов", uk: "Вибір Рейтингів" },
            // --- New Movie Logo Strings ---
            movie_logo_toggle_name: { en: "Movie Logo", ru: "Логотип фильма", uk: "Логотип фільму" },
            movie_logo_toggle_desc: { en: "Display media logos instead of text titles", ru: "Отображать логотипы медиа вместо текстовых названий", uk: "Відображати логотипи медіа замість текстових назв" },
            // --- Original Full Notext ---
            full_notext: { en: 'No description', ru: 'Нет описания'}
        });
    }

    // --- Settings UI Registration ---
    if (window.Lampa && Lampa.SettingsApi) {
        console.log('[Logo Plugin] Registering settings...');
        // 1. Add the Settings Category (Original - Unchanged)
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        // 2. Add the API Key parameter (Original - Unchanged)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' },
            field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

        // 3. Add Button to Open Rating Selection (Original - Unchanged)
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',
            param: { name: 'select_ratings_button', type: 'button' },
            field: { name: Lampa.Lang.translate('select_ratings_button_name'), description: Lampa.Lang.translate('select_ratings_button_desc') },
            onChange: function () { showRatingProviderSelection(); }
        });

        // *** Movie Logo Toggle Setting (MOVED to last, default changed) ***
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', // Target the existing component
            param: {
                name: 'show_media_logos',     // Internal name
                type: 'trigger',             // Toggle switch
                'default': 'false',          // *** Default state set to OFF ***
            },
            field: {
                name: Lampa.Lang.translate('movie_logo_toggle_name'),       // Display name (translated)
                description: Lampa.Lang.translate('movie_logo_toggle_desc') // Description (translated)
            }
            // No onChange needed unless explicitly required later
        });
        console.log('[Logo Plugin] Settings registered.');

    } else {
        console.error("[Logo Plugin] Lampa.SettingsApi not available.");
    }

    // --- Network Instance --- (Original - Unchanged)
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Caching Functions --- (Original - Unchanged)
    function getCache(tmdb_id) { /* ... original code ... */ }
    function setCache(tmdb_id, data) { /* ... original code ... */ }

    // --- Core Fetching Logic --- (Original - Unchanged)
    function fetchRatings(movieData, callback) { /* ... original MDBList fetching code ... */ }

    // --- MDBList Fetcher State --- (Original - Unchanged)
    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};

    // --- Function to display rating provider selection --- (Original - Unchanged)
    function showRatingProviderSelection() { /* ... original code ... */ }

    // --- create function (Info Panel Handler) ---
    function create() {
        var html; var timer;
        var network = new Lampa.Reguest(); // Kept original network instance here
        var loaded = {};

        this.create = function () { // (Original Structure - Unchanged)
             console.log('[Logo Focus] create(): Initializing HTML structure');
             html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
        };

        this.update = function (data) { // ** MODIFIED to include logo logic WITH LOGGING **
            var _this = this;
            console.log('[Logo Focus] update(): Received data:', data);

            // Set default text content first (Original - Unchanged)
            html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            html.find('.new-interface-info__title').text(data.title); // Set text title initially
            console.log('[Logo Focus] update(): Set initial text title:', data.title);
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            // *** Logo Logic Start ***
            console.log('[Logo Focus] Checking setting...');
            // *** Check the setting (defaulting to 'false' now) ***
            if (Lampa.Storage.get('show_media_logos', 'false') !== 'true') {
                 console.log('[Logo Focus] Setting is OFF. Skipping logo fetch.');
                 // Ensure text title remains if logic is skipped
                 html.find('.new-interface-info__title').text(data.title);
            } else {
                console.log('[Logo Focus] Setting is ON. Proceeding with logo logic.');
                if (!data || !data.id) {
                    console.log('[Logo Focus] No data or data.id found. Skipping logo fetch.');
                    return;
                }

                let unique_id = (data.name ? 'tv_' : 'movie_') + data.id;
                let logoMaxHeight = '125px'; // Keep as 125px for now
                let targetElement$ = html.find('.new-interface-info__title'); // Define target element

                console.log(`[Logo Focus] Unique ID: ${unique_id}`);

                // 1. Check Cache
                console.log(`[Logo Focus] Checking cache for key: ${unique_id}`);
                if (window.shared_logo_cache.hasOwnProperty(unique_id)) {
                    let cached_data = window.shared_logo_cache[unique_id];
                    console.log('[Logo Focus] Cache HIT. Cached data:', cached_data);
                    if (cached_data && cached_data !== 'not_found') {
                        console.log('[Logo Focus] Using cached logo HTML.');
                        targetElement$.html(cached_data);
                    } else {
                        console.log('[Logo Focus] Cached as "not_found". Ensuring text title.');
                        targetElement$.text(data.title); // Ensure text title if 'not_found'
                    }
                    // Don't proceed to fetch if cache hit
                } else {
                    // 2. Fetch Logo (if not cached)
                    console.log('[Logo Focus] Cache MISS. Fetching logo...');
                     targetElement$.text(data.title); // Ensure text title is displayed while fetching

                    let item_id = data.id;
                    let method = data.method || (data.name ? 'tv' : 'movie');
                    let api_path = (method === 'tv' ? `tv/${item_id}/images` : `movie/${item_id}/images`);
                    let api_url = Lampa.TMDB.api(api_path + "?api_key=" + Lampa.TMDB.key() + "&language=" + Lampa.Storage.get("language"));

                    console.log(`[Logo Focus] API URL: ${api_url}`);

                    $.get(api_url, function(response) {
                        console.log(`[Logo Focus] API Success Response for ${unique_id}:`, response);
                        let logo_url = null;
                        let logo_path = null;

                        if (response.logos && response.logos.length > 0) {
                            logo_path = response.logos[0].file_path; // Take first
                            console.log(`[Logo Focus] Found logo path: ${logo_path}`);
                        } else {
                            console.log(`[Logo Focus] No logos found in API response.`);
                        }

                        if (logo_path) {
                            logo_url = Lampa.TMDB.image("/t/p/w300" + logo_path.replace(".svg", ".png"));
                            let img_html = `<img class="plugin-logo-focus" style="max-height: ${logoMaxHeight}; width: auto; max-width: 90%; display: block; margin: 5px auto 0 auto;" src="${logo_url}" alt="Logo"/>`;
                            console.log(`[Logo Focus] Generated img HTML. Updating DOM element.`);
                            targetElement$.html(img_html);
                            console.log(`[Logo Focus] Caching result HTML for ${unique_id}`);
                            window.shared_logo_cache[unique_id] = img_html;
                        } else {
                            console.log(`[Logo Focus] No usable logo path. Caching 'not_found' for ${unique_id}`);
                            window.shared_logo_cache[unique_id] = 'not_found';
                            console.log(`[Logo Focus] Ensuring text title remains.`);
                            targetElement$.text(data.title);
                        }
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.error(`[Logo Focus] API call failed for ${unique_id}. Status: ${textStatus}, Error: ${errorThrown}`, jqXHR);
                        console.log(`[Logo Focus] Caching 'not_found' due to API failure for ${unique_id}`);
                        window.shared_logo_cache[unique_id] = 'not_found';
                        console.log(`[Logo Focus] Ensuring text title remains after failure.`);
                        targetElement$.text(data.title);
                    });
                } // End cache miss logic
            } // End setting ON logic
             // *** Logo Logic End ***


            // --- Original MDBList Rating Fetch Logic --- (Unchanged)
            delete mdblistRatingsCache[data.id];
            delete mdblistRatingsPending[data.id];
            if (data.id && data.method) {
                mdblistRatingsPending[data.id] = true;
                fetchRatings(data, function(mdblistResult) {
                    mdblistRatingsCache[data.id] = mdblistResult;
                    delete mdblistRatingsPending[data.id];
                    var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                    if (loaded[tmdb_url]) { _this.draw(loaded[tmdb_url]); }
                 });
            } else if (!data.method) { console.warn('[Logo Focus] update(): data.method missing.'); }
            this.load(data);
        }; // End update function

        this.draw = function (data) { /* (Original Draw Function - Unchanged) */ };
        this.load = function (data) { /* (Original Load Function - Unchanged) */ };
        this.render = function () { return html; }; // (Original - Unchanged)
        this.empty = function () {}; // (Original - Unchanged)
        this.destroy = function () { /* (Original - Unchanged) */ };
    } // End create function


    // --- component function (Main List Handler) --- (Original - Unchanged)
    function component(object) { /* ... original component code ... */ }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        console.log('[Logo Plugin] startPlugin() called.');
        // Check Lampa components (Original - Unchanged)
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { console.error("[Logo Plugin] Missing Lampa components"); return; }

        // Apply Interface Override (Original - Unchanged)
        window.plugin_interface_ready = true;
        var old_interface = Lampa.InteractionMain;
        var new_interface = component;
        Lampa.InteractionMain = function (object) { var use = new_interface; if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; if (window.innerWidth < 767) use = old_interface; if (!Lampa.Account.hasPremium()) use = old_interface; if (Lampa.Manifest.app_digital < 153) use = old_interface; return new use(object); };
        console.log('[Logo Plugin] Interface override applied.');

        // Apply CSS Styles (Original - Unchanged)
        var style_id = 'new_interface_style_adjusted_padding';
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove();
            Lampa.Template.add(style_id, `<style data-id="${style_id}"> /* --- All Original CSS --- */ </style>`);
            $('body').append(Lampa.Template.get(style_id, {}, true));
             console.log('[Logo Plugin] CSS styles applied.');
        }

        // *** Full Screen Logo Listener (with Logging) ***
        console.log('[Logo Full] Setting up Full Screen Listener...');
        if (!window.logo_plugin_fullscreen_listener_added) {
            window.logo_plugin_fullscreen_listener_added = true;
            console.log('[Logo Full] Adding listener for "full" event.');

            Lampa.Listener.follow("full", function(listenerEventData) {
                console.log('[Logo Full] Listener triggered. Event type:', listenerEventData.type);

                // Check if the event indicates the full screen is ready
                if (listenerEventData.type !== 'complite') { // Using 'complite' as per original plugin
                     console.log('[Logo Full] Event type is not "complite". Ignoring.');
                     return;
                }
                console.log('[Logo Full] Event type is "complite". Processing...');

                // Check the setting
                console.log('[Logo Full] Checking setting...');
                 // *** Check the setting (defaulting to 'false' now) ***
                if (Lampa.Storage.get('show_media_logos', 'false') !== 'true') {
                    console.log('[Logo Full] Setting is OFF. Skipping logo fetch.');
                    return;
                }
                console.log('[Logo Full] Setting is ON.');

                var movieData = listenerEventData.data.movie;
                console.log('[Logo Full] Received movie data:', movieData);

                if (!movieData || !movieData.id) {
                    console.log('[Logo Full] No movieData or movieData.id found. Skipping.');
                    return;
                }

                // IMPORTANT: Verify this selector is correct for your Lampa setup
                let targetSelector = '.full-start-new__title';
                console.log(`[Logo Full] Attempting to find target element: ${targetSelector}`);
                var targetElement$ = listenerEventData.object.activity.render().find(targetSelector);

                if (!targetElement$.length) {
                     console.error(`[Logo Full] Target element "${targetSelector}" NOT FOUND in full screen view.`);
                     return; // Stop if target element doesn't exist
                }
                 console.log(`[Logo Full] Target element "${targetSelector}" FOUND (${targetElement$.length}).`);

                let unique_id = (movieData.name ? 'tv_' : 'movie_') + movieData.id;
                let logoMaxHeight = '125px';
                console.log(`[Logo Full] Unique ID: ${unique_id}`);

                // 1. Check Cache
                console.log(`[Logo Full] Checking cache for key: ${unique_id}`);
                if (window.shared_logo_cache.hasOwnProperty(unique_id)) {
                    let cached_data = window.shared_logo_cache[unique_id];
                     console.log('[Logo Full] Cache HIT. Cached data:', cached_data);
                    if (cached_data && cached_data !== 'not_found') {
                        console.log('[Logo Full] Using cached logo HTML.');
                        targetElement$.html(cached_data);
                    } else {
                         console.log('[Logo Full] Cached as "not_found". Lampa will show text title.');
                    }
                    return; // Stop processing, used cache
                }

                // 2. Fetch Logo (if not cached)
                console.log('[Logo Full] Cache MISS. Fetching logo...');
                let item_id = movieData.id;
                let method = movieData.method || (movieData.name ? 'tv' : 'movie');
                let api_path = (method === 'tv' ? `tv/${item_id}/images` : `movie/${item_id}/images`);
                let api_url = Lampa.TMDB.api(api_path + "?api_key=" + Lampa.TMDB.key() + "&language=" + Lampa.Storage.get("language"));
                 console.log(`[Logo Full] API URL: ${api_url}`);

                $.get(api_url, function(response) {
                    console.log(`[Logo Full] API Success Response for ${unique_id}:`, response);
                    let logo_url = null;
                    let logo_path = null;
                    if (response.logos && response.logos.length > 0) {
                        logo_path = response.logos[0].file_path;
                        console.log(`[Logo Full] Found logo path: ${logo_path}`);
                    } else {
                        console.log(`[Logo Full] No logos found in API response.`);
                    }

                    if (logo_path) {
                        logo_url = Lampa.TMDB.image("/t/p/w300" + logo_path.replace(".svg", ".png"));
                        let img_html = `<img class="plugin-logo-full" style="max-height: ${logoMaxHeight}; width: auto; max-width: 95%; display: block; margin: 5px auto 0 auto;" src="${logo_url}" alt="Logo"/>`;
                         console.log(`[Logo Full] Generated img HTML. Updating DOM element.`);
                        targetElement$.html(img_html);
                        console.log(`[Logo Full] Caching result HTML for ${unique_id}`);
                        window.shared_logo_cache[unique_id] = img_html;
                    } else {
                        console.log(`[Logo Full] No usable logo path. Caching 'not_found' for ${unique_id}`);
                        window.shared_logo_cache[unique_id] = 'not_found';
                    }
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    console.error(`[Logo Full] API call failed for ${unique_id}. Status: ${textStatus}, Error: ${errorThrown}`, jqXHR);
                     console.log(`[Logo Full] Caching 'not_found' due to API failure for ${unique_id}`);
                    window.shared_logo_cache[unique_id] = 'not_found';
                });

            }); // End Lampa.Listener.follow("full")
        } else {
            console.log('[Logo Full] Full screen listener already added.');
        }
        // *** END Full Screen Listener Logic ***

        console.log('[Logo Plugin] startPlugin() finished.');

    } // End startPlugin function

    // Original check before starting (Unchanged)
    if (!window.plugin_interface_ready) {
        startPlugin();
    } else {
        console.log('[Logo Plugin] Skipping startPlugin() as plugin_interface_ready is already true.');
        // Potentially add the full screen listener here too if startPlugin might be skipped
        // but the listener is desired regardless? For now, assuming startPlugin runs once.
    }

})(); // End Main IIFE
