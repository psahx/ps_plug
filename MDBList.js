// == Lampa Plugin: Merged New Interface Enhancements + MDBList Ratings ==
// Purpose: Single script combining MDBList_Fetcher logic with enhancements
//          for the 'new-interface' component. Uses "Wrap and Patch".
// Version: 3.1 (Merged, Listener+Element Init, Added Logging)
(function (window) {
    'use strict';

    const PLUGIN_NAME = "Merged Interface Plugin v3.1"; // Name for logs

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest || !window.Lampa.SettingsApi) {
        console.error(`${PLUGIN_NAME}: Required Lampa components are not available at script load.`);
        return;
    }
    console.log(`${PLUGIN_NAME}: Base Lampa components found.`);

    // =========================================================================
    // == Embedded MDBList_Fetcher Logic ==
    // =========================================================================
    console.log(`${PLUGIN_NAME}: Setting up embedded MDBList_Fetcher logic...`);

    // --- Fetcher Configuration ---
    var fetcher_config = {
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 12 * 1000,
        cache_key: 'mdblist_ratings_cache',
        cache_limit: 500,
        request_timeout: 10000
    };

    // --- Fetcher Language Strings & Settings UI ---
    (function registerFetcherSettings() {
        try {
            Lampa.Lang.add({
                mdblist_api_key_desc: {
                    ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для встроенного MDBList Fetcher)",
                    en: "Enter your API key from api.mdblist.com (required for built-in MDBList Fetcher)",
                    uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для вбудованого MDBList Fetcher)"
                },
                full_notext: { en: 'No description', ru: 'Нет описания'}
            });

            if (!Lampa.SettingsApi.get('additional_ratings')) {
                 Lampa.SettingsApi.addComponent({ component: 'additional_ratings', name: 'Additional Ratings', icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>' });
                 console.log(`${PLUGIN_NAME}: Added 'Additional Ratings' settings category.`);
             } else {
                 // console.log(`${PLUGIN_NAME}: 'Additional Ratings' settings category already exists.`);
             }

             if (!Lampa.SettingsApi.getParam('additional_ratings', 'mdblist_api_key')) {
                Lampa.SettingsApi.addParam({
                    component: 'additional_ratings',
                    param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' },
                    field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
                    onChange: function() { Lampa.Settings.update(); }
                });
                 console.log(`${PLUGIN_NAME}: Added 'MDBList API Key' setting.`);
             } else {
                 // console.log(`${PLUGIN_NAME}: 'MDBList API Key' setting already exists.`);
             }
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error registering fetcher settings`, e);
        }
    })();

    // --- Fetcher Network Instance ---
    var fetcher_network = new Lampa.Reguest();

    // --- Fetcher Caching Functions (Using Lampa Storage for Persisted Cache) ---
    function getPersistedCache(tmdb_id) {
        try {
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache(fetcher_config.cache_key, fetcher_config.cache_limit, {});
            if (cache[tmdb_id]) {
                if ((timestamp - cache[tmdb_id].timestamp) > fetcher_config.cache_time) {
                    // console.debug(`${PLUGIN_NAME} Fetcher: Cache expired for TMDB ID:`, tmdb_id);
                    delete cache[tmdb_id]; Lampa.Storage.set(fetcher_config.cache_key, cache); return false;
                }
                // console.debug(`${PLUGIN_NAME} Fetcher: Cache hit for TMDB ID:`, tmdb_id);
                return cache[tmdb_id].data;
            }
        } catch(e){ console.error(`${PLUGIN_NAME} Fetcher: Error getting persisted cache`, e); }
        // console.debug(`${PLUGIN_NAME} Fetcher: Cache miss for TMDB ID:`, tmdb_id);
        return false;
    }

    function setPersistedCache(tmdb_id, data) {
        try {
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache(fetcher_config.cache_key, fetcher_config.cache_limit, {});
            cache[tmdb_id] = { timestamp: timestamp, data: data };
            Lampa.Storage.set(fetcher_config.cache_key, cache);
            // console.debug(`${PLUGIN_NAME} Fetcher: Cached data for TMDB ID:`, tmdb_id, data);
        } catch(e){ console.error(`${PLUGIN_NAME} Fetcher: Error setting persisted cache`, e); }
    }

    // --- Core Fetching Logic Function (Embedded) ---
    function fetchRatings(movieData, callback) {
        // console.debug(`${PLUGIN_NAME} Fetcher: fetchRatings called for ID:`, movieData?.id, 'Method:', movieData?.method);
        if (!movieData || !movieData.id || !movieData.method || !callback) {
             console.error(`${PLUGIN_NAME} Fetcher: Invalid input - requires movieData {id, method}, and callback.`);
             if (callback) callback({ error: "Invalid input data" }); return;
        }
        var tmdb_id = movieData.id;
        var cached_ratings = getPersistedCache(tmdb_id);
        if (cached_ratings) { callback(cached_ratings); return; }
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) { callback({ error: "MDBList API Key not configured in Additional Ratings settings" }); return; }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = `${fetcher_config.api_url}${media_type}/${tmdb_id}?apikey=${apiKey}`;
        // console.debug(`${PLUGIN_NAME} Fetcher: Making API request to:`, fetcher_config.api_url + media_type + '/' + tmdb_id); // Avoid logging key

        fetcher_network.clear(); fetcher_network.timeout(fetcher_config.request_timeout);
        fetcher_network.silent(api_url, function (response) {
            // console.debug(`${PLUGIN_NAME} Fetcher: API Success for ID:`, tmdb_id, response);
            var ratingsResult = { error: null };
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(r => { if (r.source && r.value !== null) ratingsResult[r.source] = r.value; });
            } else if (response && response.error) {
                 console.error(`${PLUGIN_NAME} Fetcher: API Error from MDBList for ID:`, tmdb_id, response.error);
                 ratingsResult.error = "MDBList API Error: " + response.error;
            } else {
                 console.error(`${PLUGIN_NAME} Fetcher: Invalid response format from MDBList for ID:`, tmdb_id, response);
                 ratingsResult.error = "Invalid response format from MDBList";
            }
             if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) setPersistedCache(tmdb_id, ratingsResult);
             callback(ratingsResult);
        }, function (xhr, status) {
            var errorMessage = "MDBList request failed"; if (status) errorMessage += ` (Status: ${status})`;
            console.error(`${PLUGIN_NAME} Fetcher:`, errorMessage, "for ID:", tmdb_id);
            var errorResult = { error: errorMessage };
             if (status !== 401 && status !== 403) setPersistedCache(tmdb_id, errorResult);
             callback(errorResult);
        });
    }
    console.log(`${PLUGIN_NAME}: Embedded MDBList_Fetcher logic ready.`);

    // =========================================================================
    // == Interface Enhancement Logic ==
    // =========================================================================
    console.log(`${PLUGIN_NAME}: Setting up interface enhancement logic...`);

    // --- Interface Constants ---
    const STYLE_ID = 'merged_new_interface_style_v2';
    const TARGET_CLASS = 'new-interface';
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info';

    // --- Interface Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';

    // --- Plugin In-Memory State (for current view interaction) ---
    let plugin_mdblist_results_cache = {};
    let plugin_mdblist_pending = {};

    // --- CSS Injection Function ---
    function injectCSS() {
         console.log(`${PLUGIN_NAME}: Attempting to inject CSS...`);
         try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) {
                 // console.log(`${PLUGIN_NAME}: CSS already injected.`);
                 return;
             }
            const css = `
            <style data-id="${STYLE_ID}">
                /* ... (Full CSS content as provided in previous correct version) ... */
                .new-interface-info { height: 22.5em; }
                .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.5em; overflow: hidden; height: auto; }
                .new-interface .full-start__rate > div { font-weight: normal; font-size: 1em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0.1em 0.3em; border-radius: 0.3em; line-height: 1.3; order: 1; display: flex; align-items: center; flex-shrink: 0; }
                .rt-rating-item > div.rt-score { padding-left: 1.2em; padding-right: 1.2em; }
                .placeholder-value { color: rgba(255, 255, 255, 0.6); }
                .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; flex-shrink: 0; }
                .tmdb-logo { height: 0.9em; } .rt-logo { height: 1.1em; }
                .new-interface .card--small.card--wide { width: 18.3em; } .new-interface-info { position: relative; padding: 1.5em; }
                .new-interface-info__body { width: 80%; padding-top: 1.1em; } .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; } .new-interface-info__head span { color: #fff; }
                .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
                .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; gap: 0.5em 0; } .new-interface-info__split { margin: 0 1em; font-size: 0.7em; display: inline-block; vertical-align: middle; }
                .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
                .new-interface .card-more__box { padding-bottom: 95%; } .new-interface .full-start__background { height: 108%; top: -6em; } .new-interface .card__promo { display: none; }
                .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; } .new-interface .card.card--wide .card-watched { display: none !important; }
                body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; } body.light--version .new-interface-info { height: 25.3em; }
                body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
                body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
            </style>
            `;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error injecting CSS`, e); }
    }

    // --- Patched Method Logic ---
    // IMPORTANT: 'this' inside these functions refers to the instance being patched

    function modifiedUpdateLogic(data) {
        var _thisInfo = this; // 'this' = info panel instance
        // console.debug(`${PLUGIN_NAME}: Patched update called for ID:`, data?.id);
        try {
            // Original UI updates
            _thisInfo.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            _thisInfo.html.find('.new-interface-info__title').text(data.title);
            _thisInfo.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            // Use plugin's in-memory state
            delete plugin_mdblist_results_cache[data.id];
            delete plugin_mdblist_pending[data.id];

            // Call embedded fetchRatings
            if (data.id && data.method) {
                 plugin_mdblist_pending[data.id] = true;
                 const fetchData = { id: data.id, method: data.method };
                 // console.debug(`${PLUGIN_NAME}: Calling embedded fetchRatings...`);
                 fetchRatings(fetchData, function(mdblistResult) {
                     // console.debug(`${PLUGIN_NAME}: fetchRatings callback received for ID:`, data.id, mdblistResult);
                     plugin_mdblist_results_cache[data.id] = mdblistResult;
                     delete plugin_mdblist_pending[data.id];
                     var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                     if (_thisInfo && _thisInfo.loaded && _thisInfo.loaded[tmdb_url] && typeof _thisInfo.draw === 'function') {
                         // console.debug(`${PLUGIN_NAME}: TMDB loaded, re-drawing with MDBList results.`);
                         _thisInfo.draw(_thisInfo.loaded[tmdb_url]);
                     } else {
                          // console.debug(`${PLUGIN_NAME}: TMDB not loaded yet.`);
                     }
                 });
             } else { console.warn(`${PLUGIN_NAME}: ID or Method missing in update data, cannot fetch ratings.`, data); }

            // Call original TMDB load logic (now potentially patched load)
            if (typeof _thisInfo.load === 'function') {
                 _thisInfo.load(data);
            } else {
                 console.error(`${PLUGIN_NAME}: this.load is not a function in patched update.`);
            }
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched update logic`, e); }
    }

    function modifiedDrawLogic(data) {
        var _thisInfo = this; // 'this' = info panel instance
        // console.debug(`${PLUGIN_NAME}: Patched draw called for ID:`, data?.id);
         try {
            // ... (Draw logic with ratings/logos as defined in previous correct version) ...
            var createYear = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [], details = [], countries = Lampa.Api.sources.tmdb.parseCountries(data), pg = Lampa.Api.sources.tmdb.parsePG(data);

            if (createYear !== '0000') head.push('<span>' + createYear + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            var mdblistResult = plugin_mdblist_results_cache[data.id]; // Use plugin's in-memory cache
            var imdbRating = '---', rtScoreDisplay = '--%', rtLogoUrl = '';

            if (mdblistResult) {
                if (mdblistResult.error === null) {
                    if (mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') imdbRating = parseFloat(mdblistResult.imdb).toFixed(1);
                    if (mdblistResult.tomatoes !== undefined && mdblistResult.tomatoes !== null && typeof mdblistResult.tomatoes === 'number') {
                        let score = mdblistResult.tomatoes; rtLogoUrl = score >= 60 ? rtFreshLogoUrl : (score >= 0 ? rtRottenLogoUrl : ''); rtScoreDisplay = score >= 0 ? score + '%' : 'N/A';
                    }
                } else { imdbRating = 'ERR'; console.warn(`${PLUGIN_NAME}: MDBList error for draw:`, mdblistResult.error); }
            } else if (plugin_mdblist_pending[data.id]){
                 // console.debug(`${PLUGIN_NAME}: MDBList pending for draw ID:`, data.id);
                 // Keep placeholders '---' etc.
            }

            details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>');
            details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>');
            if (rtLogoUrl) details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + rtScoreDisplay + '</div><img src="' + rtLogoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>');
            // Optionally add RT placeholder if pending/no data?
            // else if (plugin_mdblist_pending[data.id] || !mdblistResult) details.push('<div class="full-start__rate rt-rating-item"><div class="placeholder-value rt-score">--%</div><img src="'+rtFreshLogoUrl+'" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>');


            if (data.genres && data.genres.length > 0) details.push(data.genres.map(item => Lampa.Utils.capitalizeFirstLetter(item.name)).join(' | '));
            if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');

            _thisInfo.html.find('.new-interface-info__head').empty().append(head.join(', '));
            _thisInfo.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
            // console.debug(`${PLUGIN_NAME}: Patched draw completed for ID:`, data?.id);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched draw logic`, e); }
    }

    function modifiedLoadLogic(data) {
        var _thisInfo = this; // 'this' = info panel instance
        // console.debug(`${PLUGIN_NAME}: Patched load called for ID:`, data?.id);
         try {
            clearTimeout(_thisInfo.timer);
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

            if (_thisInfo.loaded && _thisInfo.loaded[url]) {
                 if (!_thisInfo.loaded[url].method) _thisInfo.loaded[url].method = data.name ? 'tv' : 'movie';
                 // console.debug(`${PLUGIN_NAME}: TMDB cache hit in patched load, drawing.`);
                 return _thisInfo.draw(_thisInfo.loaded[url]);
            }

            if (!_thisInfo.network) { console.warn(`${PLUGIN_NAME}: Creating network instance in patched load.`); _thisInfo.network = new Lampa.Reguest(); }

            _thisInfo.timer = setTimeout(function () {
                if (!_thisInfo.network || !_thisInfo.loaded || !_thisInfo.draw) { /*console.debug(`${PLUGIN_NAME}: Instance destroyed before TMDB load timeout completed.`);*/ return; }
                // console.debug(`${PLUGIN_NAME}: TMDB load timeout, fetching TMDB data...`);
                _thisInfo.network.clear(); _thisInfo.network.timeout(5000);
                _thisInfo.network.silent(url, function (movie) {
                    if (!_thisInfo.loaded || !_thisInfo.draw) { /*console.debug(`${PLUGIN_NAME}: Instance destroyed before TMDB load network completed.`);*/ return; }
                    // console.debug(`${PLUGIN_NAME}: TMDB data fetched successfully.`);
                    _thisInfo.loaded[url] = movie;
                    if (!movie.method) movie.method = data.name ? 'tv' : 'movie';
                    _thisInfo.draw(movie); // Call patched draw
                });
            }, 300);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched load logic`, e); }
    }

    function modifiedInfoDestroyLogic() {
         var _thisInfo = this; // 'this' = info panel instance
         // console.debug(`${PLUGIN_NAME}: Patched info destroy called.`);
         try {
            if(_thisInfo.html) _thisInfo.html.remove();
            if(_thisInfo.network) _thisInfo.network.clear();
            clearTimeout(_thisInfo.timer);
            _thisInfo.loaded = {}; _thisInfo.html = null; _thisInfo.network = null; _thisInfo.timer = null;

            // Clear only the plugin's in-memory cache/pending state
            plugin_mdblist_results_cache = {}; plugin_mdblist_pending = {};
            // console.debug(`${PLUGIN_NAME}: Cleared plugin in-memory MDBList cache.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched info destroy logic`, e); }
    }

    function modifiedCompBuildLogic(data) {
        var _thisComp = this; // 'this' = main component instance
        // console.debug(`${PLUGIN_NAME}: Patched build started.`);
        try {
            _thisComp.lezydata = data;

            // Create info panel instance using original constructor
            if (typeof _thisComp.create === 'function') {
                 // console.debug(`${PLUGIN_NAME}: Creating info panel instance...`);
                 _thisComp.info = new _thisComp.create(_thisComp.object);
                 _thisComp.info.create(); // Create HTML structure
            } else {
                console.error(`${PLUGIN_NAME}: Cannot find original 'create' function constructor on component instance.`);
                _thisComp.info = null;
            }

            // Patch the created info panel instance
            if (_thisComp.info) {
                 // console.debug(`${PLUGIN_NAME}: Info panel instance created, attempting patch...`);
                 // Add necessary properties if missing
                 _thisComp.info.html = $(_thisComp.info.render());
                 _thisComp.info.loaded = typeof _thisComp.info.loaded === 'object' ? _thisComp.info.loaded : {};
                 _thisComp.info.network = _thisComp.info.network || new Lampa.Reguest();
                 _thisComp.info.timer = _thisComp.info.timer || null;

                 // Apply patches
                 _thisComp.info.update = modifiedUpdateLogic.bind(_thisComp.info);
                 _thisComp.info.draw = modifiedDrawLogic.bind(_thisComp.info);
                 _thisComp.info.load = modifiedLoadLogic.bind(_thisComp.info);
                 _thisComp.info.destroy = modifiedInfoDestroyLogic.bind(_thisComp.info);
                 // console.debug(`${PLUGIN_NAME}: Info panel instance patched successfully.`);
            } else {
                 console.warn(`${PLUGIN_NAME}: Info panel instance not available for patching.`);
            }

            // Continue build...
            if (_thisComp.info) _thisComp.scroll.minus(_thisComp.info.render());
            // Use the already patched 'append' method
            data.slice(0, _thisComp.viewall ? data.length : 2).forEach(_thisComp.append.bind(_thisComp));
            if (_thisComp.info) _thisComp.html.append(_thisComp.info.render());
            _thisComp.html.append(_thisComp.scroll.render());

            if (_thisComp.newlampa) { // Original scroll setup logic
                Lampa.Layer.update(_thisComp.html); Lampa.Layer.visible(_thisComp.scroll.render(true));
                _thisComp.scroll.onEnd = _thisComp.loadNext.bind(_thisComp);
                _thisComp.scroll.onWheel = function (step) {
                    if (!Lampa.Controller.own(_thisComp)) _thisComp.start();
                    if (step > 0) _thisComp.down(); else if (_thisComp.active > 0) _thisComp.up();
                };
            }

            // Load initial item info (using patched methods)
            if (_thisComp.items.length > 0 && _thisComp.items[0] && _thisComp.items[0].data && _thisComp.info) {
                // console.debug(`${PLUGIN_NAME}: Loading initial item info in build.`);
                _thisComp.active = 0;
                if (!_thisComp.items[0].data.method) _thisComp.items[0].data.method = _thisComp.items[0].data.name ? 'tv' : 'movie';
                _thisComp.info.update(_thisComp.items[0].data); // Calls patched update
                _thisComp.background(_thisComp.items[0].data); // Calls patched background
            } else {
                 // console.debug(`${PLUGIN_NAME}: No initial item data or info panel to load.`);
            }

            // Finalize build
             if(_thisComp.activity && typeof _thisComp.activity.loader === 'function'){
                  _thisComp.activity.loader(false); _thisComp.activity.toggle();
                  // console.debug(`${PLUGIN_NAME}: Patched build finished, activity toggled.`);
             } else { console.warn(`${PLUGIN_NAME}: this.activity reference missing in build finish.`); }

        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched build logic`, e); }
    }

    function modifiedCompAppendLogic(element) {
        var _thisComp = this; // 'this' = main component instance
        // console.debug(`${PLUGIN_NAME}: Patched append called.`);
        try {
            if (element.ready) return; element.ready = true;
            var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: _thisComp.object.genres, object: _thisComp.object, card_wide: true, nomore: element.nomore });
            item.create();
            item.onDown = _thisComp.down.bind(_thisComp); item.onUp = _thisComp.up.bind(_thisComp); item.onBack = _thisComp.back.bind(_thisComp);
            item.onToggle = function () { _thisComp.active = _thisComp.items.indexOf(item); };
            if (_thisComp.onMore) item.onMore = _thisComp.onMore.bind(_thisComp);

            // Modified focus/hover handlers
            item.onFocus = function (elem) {
                // console.debug(`${PLUGIN_NAME}: Patched append - onFocus triggered.`);
                if (!elem.method) elem.method = elem.name ? 'tv' : 'movie';
                if (_thisComp.info) _thisComp.info.update(elem); // Calls patched update
                _thisComp.background(elem); // Calls patched background
            };
            item.onHover = function (elem) {
                 // console.debug(`${PLUGIN_NAME}: Patched append - onHover triggered.`);
                 if (!elem.method) elem.method = elem.name ? 'tv' : 'movie';
                 if (_thisComp.info) _thisComp.info.update(elem); // Calls patched update
                 _thisComp.background(elem); // Calls patched background
            };
            if (_thisComp.info && typeof _thisComp.info.empty === 'function') item.onFocusMore = _thisComp.info.empty.bind(_thisComp.info);

            _thisComp.scroll.append(item.render()); _thisComp.items.push(item);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched append logic`, e); }
    }

    function modifiedCompBackgroundLogic(elem) {
         var _thisComp = this; // 'this' = main component instance
         // console.debug(`${PLUGIN_NAME}: Patched background called.`);
         try {
            if (!elem || !elem.backdrop_path) { /*console.debug(`${PLUGIN_NAME}: No element or backdrop for background.`);*/ return; }
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(_thisComp.background_timer);
            if (new_background == _thisComp.background_last) { /*console.debug(`${PLUGIN_NAME}: Background unchanged.`);*/ return; }

            if (!_thisComp.background_img || !_thisComp.background_img.length) {
                 // console.debug(`${PLUGIN_NAME}: Finding background img element.`);
                 _thisComp.background_img = _thisComp.html.find('.full-start__background');
                 if (!_thisComp.background_img.length) { /*console.warn(`${PLUGIN_NAME}: Background img element not found.`);*/ return; }
             }

            // console.debug(`${PLUGIN_NAME}: Setting new background timeout.`);
            _thisComp.background_timer = setTimeout(function () {
                if (!_thisComp.background_img || !_thisComp.background_img.length) return;
                // console.debug(`${PLUGIN_NAME}: Background timeout fired.`);
                _thisComp.background_img.removeClass('loaded');
                if (_thisComp.background_img[0]) {
                    _thisComp.background_img[0].onload = () => { if (_thisComp.background_img) _thisComp.background_img.addClass('loaded'); /*console.debug(`${PLUGIN_NAME}: Background loaded.`);*/ };
                    _thisComp.background_img[0].onerror = () => { if (_thisComp.background_img) _thisComp.background_img.removeClass('loaded'); /*console.warn(`${PLUGIN_NAME}: Background failed to load.`);*/};
                    _thisComp.background_last = new_background;
                    setTimeout(() => { if (_thisComp.background_img && _thisComp.background_img[0]) _thisComp.background_img[0].src = _thisComp.background_last; }, 300);
                }
            }.bind(_thisComp), 1000);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched background logic`, e); }
    }

    function modifiedCompDestroyLogic() {
         var _thisComp = this; // 'this' = main component instance
         // console.debug(`${PLUGIN_NAME}: Patched component destroy called.`);
         try {
            clearTimeout(_thisComp.background_timer);
            if(_thisComp.network) _thisComp.network.clear();
            if(_thisComp.items) Lampa.Arrays.destroy(_thisComp.items); // Check if items exists
            if(_thisComp.scroll) _thisComp.scroll.destroy();
            if (_thisComp.info) _thisComp.info.destroy(); // Calls patched destroy
            if (_thisComp.html) _thisComp.html.remove();
            // Null assignments
            _thisComp.items = null; _thisComp.network = null; _thisComp.lezydata = null;
            _thisComp.info = null; _thisComp.html = null; _thisComp.background_timer = null;
            _thisComp.scroll = null; _thisComp.background_img = null;
        } catch (e) { console.error(`${PLUGIN_NAME}: Error in patched component destroy logic`, e); }
    }


    // --- Wrapper and Initialization Logic ---
    let originalInteractionMainFactory = null;
    let pluginInitializationAttempted = false;
    let pluginInitializationSucceeded = false;

    function ourWrappedFactory(object) {
         // console.debug(`${PLUGIN_NAME}: ourWrappedFactory called with object:`, {source: object?.source});
         let instance = null;
         try {
            if (!originalInteractionMainFactory) { throw new Error("Original factory not captured."); }
            // console.debug(`${PLUGIN_NAME}: Calling original factory...`);
            instance = originalInteractionMainFactory(object);
            // console.debug(`${PLUGIN_NAME}: Original factory returned instance:`, !!instance);
         } catch (e) { console.error(`${PLUGIN_NAME}: Error calling original InteractionMain factory`, e); return instance; }

         if (!instance) return instance;

         let conditionsMet = false;
         let isCorrectInstance = false;
         try {
            conditionsMet = (object.source == 'tmdb' || object.source == 'cub') && (window.innerWidth >= 767) && Lampa.Account.hasPremium() && (Lampa.Manifest.app_digital >= 153);
            if (instance.render) {
                 const renderedEl = instance.render();
                 isCorrectInstance = renderedEl && typeof renderedEl.hasClass === 'function' && renderedEl.hasClass(TARGET_CLASS);
            }
            // console.debug(`${PLUGIN_NAME}: Identification check: conditionsMet=${conditionsMet}, isCorrectInstance=${isCorrectInstance}`);
         } catch (e) { console.error(`${PLUGIN_NAME}: Error during identification checks`, e); }

         if (conditionsMet && isCorrectInstance) {
            // console.log(`${PLUGIN_NAME}: Target instance identified, applying patches...`);
            try {
                // Patch main component methods
                // Store original create reference before overwriting build
                 instance.originalCreate = instance.create; // Assumes 'create' exists on instance

                 // Patch methods that need modification
                 instance.build = modifiedCompBuildLogic.bind(instance);
                 instance.append = modifiedCompAppendLogic.bind(instance);
                 instance.background = modifiedCompBackgroundLogic.bind(instance);
                 instance.destroy = modifiedCompDestroyLogic.bind(instance);

                 // console.log(`${PLUGIN_NAME}: Instance patched successfully.`);
            } catch (e) {
                 console.error(`${PLUGIN_NAME}: Error applying patches`, e);
                  try{ return originalInteractionMainFactory(object); } catch(fallbackError){ return null; }
            }
         } else {
              // console.debug(`${PLUGIN_NAME}: Conditions not met or instance mismatch, using original instance.`);
         }
         return instance;
    }

    function initPlugin() {
        if (pluginInitializationSucceeded) { /*console.debug(`${PLUGIN_NAME}: Init called but already succeeded.`);*/ return; }
        pluginInitializationAttempted = true;
        // console.log(`${PLUGIN_NAME}: Initializing core wrapping logic...`);

        if (typeof Lampa.InteractionMain === 'function') {
            originalInteractionMainFactory = Lampa.InteractionMain;
            Lampa.InteractionMain = ourWrappedFactory;
            pluginInitializationSucceeded = true;
            console.log(`${PLUGIN_NAME}: Core logic initialized and Lampa.InteractionMain wrapped.`);
        } else {
            console.error(`${PLUGIN_NAME}: Lampa.InteractionMain not available or not a function at init time. Plugin disabled.`);
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded. Waiting for Lampa events...`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS();

            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                // console.debug(`${PLUGIN_NAME}: Activity ready event received.`);
                // Prevent initialization if already done or primary attempt failed
                if (pluginInitializationSucceeded || pluginInitializationAttempted) {
                    // console.debug(`${PLUGIN_NAME}: Initialization already succeeded or attempted, skipping check.`);
                    return;
                }
                try {
                    if (activityEvent.activity && typeof activityEvent.activity.render === 'function') {
                         const activityRendered = activityEvent.activity.render();
                         // Use the more specific info element selector for confirmation
                         if (activityRendered && activityRendered.find(TARGET_INFO_ELEMENT_SELECTOR).length > 0) {
                             console.log(`${PLUGIN_NAME}: Target interface element found in activity.`);
                             initPlugin(); // Attempt initialization
                         } else {
                             // console.debug(`${PLUGIN_NAME}: Target info element not found in this activity.`);
                         }
                    } else {
                         // console.warn(`${PLUGIN_NAME}: Activity object or render method missing in activity_ready event.`);
                    }
                } catch (error) {
                    console.error(`${PLUGIN_NAME}: Error in activity_ready listener check:`, error);
                    pluginInitializationAttempted = true; // Prevent retries if check itself errors
                }
            });
        }
    });

})(window); // Pass window object
