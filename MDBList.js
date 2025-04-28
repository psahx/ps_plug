// == Lampa Plugin: Merged New Interface Enhancements + MDBList Ratings ==
// Purpose: Single script combining MDBList_Fetcher logic with enhancements
//          for the 'new-interface' component. Uses "Wrap and Patch".
// Version: 3.0 (Merged, Listener+Element Init)
(function (window) {
    'use strict';

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest || !window.Lampa.SettingsApi) {
        console.error("Merged Interface Plugin: Required Lampa components are not available.");
        return;
    }

    // =========================================================================
    // == Embedded MDBList_Fetcher Logic ==
    // =========================================================================

    // --- Fetcher Configuration ---
    var fetcher_config = {
        api_url: 'https://api.mdblist.com/tmdb/',
        // api_key configured via Lampa Settings -> Additional Ratings
        cache_time: 60 * 60 * 12 * 1000, // 12 hours persisted cache duration
        cache_key: 'mdblist_ratings_cache', // Storage key for persisted ratings data
        cache_limit: 500, // Max items in persisted cache
        request_timeout: 10000 // 10 seconds request timeout
    };

    // --- Fetcher Language Strings & Settings UI ---
    (function registerFetcherSettings() {
        // Add description for the settings menu item
        Lampa.Lang.add({
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта api.mdblist.com (требуется для встроенного MDBList Fetcher)",
                en: "Enter your API key from api.mdblist.com (required for built-in MDBList Fetcher)",
                uk: "Введіть ваш API ключ з сайту api.mdblist.com (потрібно для вбудованого MDBList Fetcher)"
            },
             // Add optional lang string used by original interface code if not present
            full_notext: { en: 'No description', ru: 'Нет описания'}
        });

        // Ensure settings component isn't added multiple times if script reloads
        if (!Lampa.SettingsApi.get('additional_ratings')) {
             Lampa.SettingsApi.addComponent({
                 component: 'additional_ratings',
                 name: 'Additional Ratings',
                 icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
             });
         }

        // Ensure setting param isn't added multiple times
         if (!Lampa.SettingsApi.getParam('additional_ratings', 'mdblist_api_key')) {
            Lampa.SettingsApi.addParam({
                component: 'additional_ratings',
                param: {
                    name: 'mdblist_api_key',
                    type: 'input',
                    'default': '',
                    values: {}, // Keep - Lampa setting structure requirement
                    placeholder: 'Enter your MDBList API Key'
                },
                field: {
                    name: 'MDBList API Key',
                    description: Lampa.Lang.translate('mdblist_api_key_desc')
                },
                onChange: function() { Lampa.Settings.update(); } // Standard Lampa setting callback
            });
        }
    })(); // Immediately invoke settings registration


    // --- Fetcher Network Instance ---
    var fetcher_network = new Lampa.Reguest(); // Use a dedicated network instance for fetching

    // --- Fetcher Caching Functions (Using Lampa Storage for Persisted Cache) ---
    function getPersistedCache(tmdb_id) {
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(fetcher_config.cache_key, fetcher_config.cache_limit, {});

        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > fetcher_config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(fetcher_config.cache_key, cache);
                return false; // Expired
            }
            return cache[tmdb_id].data; // Return cached data { imdb: ..., etc... }
        }
        return false; // Cache miss
    }

    function setPersistedCache(tmdb_id, data) {
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(fetcher_config.cache_key, fetcher_config.cache_limit, {});
        cache[tmdb_id] = { timestamp: timestamp, data: data };
        Lampa.Storage.set(fetcher_config.cache_key, cache);
    }

    // --- Core Fetching Logic Function (Embedded) ---
    function fetchRatings(movieData, callback) {
        // Validate input
        if (!movieData || !movieData.id || !movieData.method || !callback) {
             console.error("Merged Plugin Fetcher: Invalid input - requires movieData {id, method}, and callback.");
             if (callback) callback({ error: "Invalid input data" });
             return;
        }

        var tmdb_id = movieData.id;

        // 1. Check Persisted Cache
        var cached_ratings = getPersistedCache(tmdb_id);
        if (cached_ratings) {
            callback(cached_ratings); // Return immediately if found
            return;
        }

        // 2. Get API Key from Storage
        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) {
            callback({ error: "MDBList API Key not configured in Additional Ratings settings" });
            return;
        }

        // 3. Prepare API Request
        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = `${fetcher_config.api_url}${media_type}/${tmdb_id}?apikey=${apiKey}`;

        // 4. Make Network Request
        fetcher_network.clear();
        fetcher_network.timeout(fetcher_config.request_timeout);
        fetcher_network.silent(api_url, function (response) {
            // Success Callback
            var ratingsResult = { error: null }; // Use object literal for result
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) {
                     if (rating.source && rating.value !== null) {
                          // Use lowercase source for consistency if needed, e.g., rating.source.toLowerCase()
                          ratingsResult[rating.source] = rating.value;
                     }
                 });
            } else if (response && response.error) {
                console.error("Merged Plugin Fetcher: API Error from MDBList for ID:", tmdb_id, response.error);
                ratingsResult.error = "MDBList API Error: " + response.error;
            } else {
                 console.error("Merged Plugin Fetcher: Invalid response format from MDBList for ID:", tmdb_id, response);
                 ratingsResult.error = "Invalid response format from MDBList";
            }
            // Cache valid results or non-auth errors persistently
             if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setPersistedCache(tmdb_id, ratingsResult);
             }
            callback(ratingsResult);

        }, function (xhr, status) {
            // Error Callback
            var errorMessage = "MDBList request failed";
            if (status) { errorMessage += ` (Status: ${status})`; }
            console.error("Merged Plugin Fetcher:", errorMessage, "for ID:", tmdb_id);
            var errorResult = { error: errorMessage };
             // Cache network/server errors persistently, but not auth errors
             if (status !== 401 && status !== 403) {
                setPersistedCache(tmdb_id, errorResult);
            }
            callback(errorResult);
        });
    }

    // =========================================================================
    // == Interface Enhancement Logic ==
    // =========================================================================

    // --- Interface Constants ---
    const STYLE_ID = 'merged_new_interface_style_v2'; // Matches CSS injection ID
    const TARGET_CLASS = 'new-interface';
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info';

    // --- Interface Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';

    // --- Plugin In-Memory State (for current view interaction) ---
    let plugin_mdblist_results_cache = {}; // Stores results for the currently viewed items
    let plugin_mdblist_pending = {}; // Tracks pending requests for the current view

    // --- CSS Injection Function ---
    function injectCSS() {
        // ... (CSS injection logic as defined in previous correct version) ...
         try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) return;
            const css = `
            <style data-id="${STYLE_ID}">
                /* Height adjustment from modified CSS */
                .new-interface-info { height: 22.5em; } /* original was 24em */
                /* --- Rating Box Styles (Copied from Modified Interface code) --- */
                .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.5em; overflow: hidden; height: auto; }
                .new-interface .full-start__rate > div { font-weight: normal; font-size: 1em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0.1em 0.3em; border-radius: 0.3em; line-height: 1.3; order: 1; display: flex; align-items: center; flex-shrink: 0; }
                .rt-rating-item > div.rt-score { padding-left: 1.2em; padding-right: 1.2em; }
                .placeholder-value { color: rgba(255, 255, 255, 0.6); }
                .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; flex-shrink: 0; }
                .tmdb-logo { height: 0.9em; }
                .rt-logo { height: 1.1em; }
                /* --- End Rating Box Styles --- */
                /* Base styles (Copied from Modified Interface code) */
                 .new-interface .card--small.card--wide { width: 18.3em; }
                 .new-interface-info { position: relative; padding: 1.5em; }
                .new-interface-info__body { width: 80%; padding-top: 1.1em; }
                .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
                .new-interface-info__head span { color: #fff; }
                .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
                .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; gap: 0.5em 0; }
                .new-interface-info__split { margin: 0 1em; font-size: 0.7em; display: inline-block; vertical-align: middle; }
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
            </style>
            `;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
        } catch (e) { console.error("Merged Plugin: Error injecting CSS", e); }
    }

    // --- Patched Method Logic ---

    function modifiedUpdateLogic(data) {
        var _thisInfo = this; // 'this' is the info panel instance
        try {
            _thisInfo.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            _thisInfo.html.find('.new-interface-info__title').text(data.title);
            _thisInfo.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            // Use plugin's in-memory state for pending/results specific to this view session
            delete plugin_mdblist_results_cache[data.id];
            delete plugin_mdblist_pending[data.id];

            // Call the embedded fetchRatings function
            if (data.id && data.method) {
                 plugin_mdblist_pending[data.id] = true;
                 const fetchData = { id: data.id, method: data.method };

                 fetchRatings(fetchData, function(mdblistResult) { // Call embedded fetcher
                     plugin_mdblist_results_cache[data.id] = mdblistResult; // Store in plugin's in-memory cache
                     delete plugin_mdblist_pending[data.id];

                     var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                     if (_thisInfo && _thisInfo.loaded && _thisInfo.loaded[tmdb_url] && typeof _thisInfo.draw === 'function') {
                         _thisInfo.draw(_thisInfo.loaded[tmdb_url]); // Call patched draw
                     }
                 });
             } else { console.warn("Merged Plugin: ID or Method missing, cannot fetch ratings.", data); }

            _thisInfo.load(data); // Call patched load
        } catch (e) { console.error("Merged Plugin: Error in patched update logic", e); }
    }

    function modifiedDrawLogic(data) {
        var _thisInfo = this; // 'this' is the info panel instance
        try {
            var createYear = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [], details = [], countries = Lampa.Api.sources.tmdb.parseCountries(data), pg = Lampa.Api.sources.tmdb.parsePG(data);

            if (createYear !== '0000') head.push('<span>' + createYear + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // Use plugin's in-memory cache for drawing
            var mdblistResult = plugin_mdblist_results_cache[data.id];
            var imdbRating = '---', rtScoreDisplay = '--%', rtLogoUrl = '';

            if (mdblistResult) {
                if (mdblistResult.error === null) {
                    if (mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') imdbRating = parseFloat(mdblistResult.imdb).toFixed(1);
                    if (mdblistResult.tomatoes !== undefined && mdblistResult.tomatoes !== null && typeof mdblistResult.tomatoes === 'number') {
                        let score = mdblistResult.tomatoes;
                        rtLogoUrl = score >= 60 ? rtFreshLogoUrl : (score >= 0 ? rtRottenLogoUrl : '');
                        rtScoreDisplay = score >= 0 ? score + '%' : 'N/A';
                    }
                } else { imdbRating = 'ERR'; }
            }

            details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>');
            details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>');
            if (rtLogoUrl) details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + rtScoreDisplay + '</div><img src="' + rtLogoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>');

            if (data.genres && data.genres.length > 0) details.push(data.genres.map(item => Lampa.Utils.capitalizeFirstLetter(item.name)).join(' | '));
            if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');

            _thisInfo.html.find('.new-interface-info__head').empty().append(head.join(', '));
            _thisInfo.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
        } catch (e) { console.error("Merged Plugin: Error in patched draw logic", e); }
    }

    function modifiedLoadLogic(data) {
        var _thisInfo = this; // 'this' is the info panel instance
         try {
            clearTimeout(_thisInfo.timer);
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

            if (_thisInfo.loaded && _thisInfo.loaded[url]) {
                 if (!_thisInfo.loaded[url].method) _thisInfo.loaded[url].method = data.name ? 'tv' : 'movie';
                 return _thisInfo.draw(_thisInfo.loaded[url]); // Call patched draw
            }

            if (!_thisInfo.network) _thisInfo.network = new Lampa.Reguest();

            _thisInfo.timer = setTimeout(function () {
                if (!_thisInfo.network || !_thisInfo.loaded || !_thisInfo.draw) return;
                _thisInfo.network.clear();
                _thisInfo.network.timeout(5000);
                _thisInfo.network.silent(url, function (movie) {
                    if (!_thisInfo.loaded || !_thisInfo.draw) return;
                    _thisInfo.loaded[url] = movie;
                    if (!movie.method) movie.method = data.name ? 'tv' : 'movie';
                    _thisInfo.draw(movie); // Call patched draw
                });
            }, 300);
        } catch (e) { console.error("Merged Plugin: Error in patched load logic", e); }
    }

    function modifiedInfoDestroyLogic() {
         var _thisInfo = this; // 'this' is the info panel instance
         try {
            // Original cleanup + checks
            if(_thisInfo.html) _thisInfo.html.remove();
            if(_thisInfo.network) _thisInfo.network.clear();
            clearTimeout(_thisInfo.timer);
            _thisInfo.loaded = {};
            _thisInfo.html = null;
            _thisInfo.network = null;
            _thisInfo.timer = null;

            // Clear plugin's in-memory view cache
            // Don't clear the global persisted cache here.
            plugin_mdblist_results_cache = {};
            plugin_mdblist_pending = {};
        } catch (e) { console.error("Merged Plugin: Error in patched info destroy logic", e); }
    }

    function modifiedCompBuildLogic(data) {
        var _thisComp = this; // 'this' is the main component instance
        try {
            _thisComp.lezydata = data;

            if (typeof _thisComp.create === 'function') {
                _thisComp.info = new _thisComp.create(_thisComp.object); // Use original constructor
                _thisComp.info.create(); // Call original method to create HTML structure
            } else {
                console.error("Merged Plugin: Cannot find original 'create' function constructor on component instance.");
                _thisComp.info = null;
            }

            // Patch the created info panel instance
            if (_thisComp.info) {
                 // Initialize properties needed by patched methods if not present
                 _thisComp.info.html = $(_thisComp.info.render());
                 _thisComp.info.loaded = typeof _thisComp.info.loaded === 'object' ? _thisComp.info.loaded : {};
                 _thisComp.info.network = _thisComp.info.network || new Lampa.Reguest();
                 _thisComp.info.timer = _thisComp.info.timer || null;

                 // Apply patches, binding to the info instance
                 _thisComp.info.update = modifiedUpdateLogic.bind(_thisComp.info);
                 _thisComp.info.draw = modifiedDrawLogic.bind(_thisComp.info);
                 _thisComp.info.load = modifiedLoadLogic.bind(_thisComp.info);
                 _thisComp.info.destroy = modifiedInfoDestroyLogic.bind(_thisComp.info);
            }

            // Continue build...
            if (_thisComp.info) _thisComp.scroll.minus(_thisComp.info.render());
            // Use the already patched 'append' method (bound later)
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
                _thisComp.active = 0;
                if (!_thisComp.items[0].data.method) _thisComp.items[0].data.method = _thisComp.items[0].data.name ? 'tv' : 'movie';
                _thisComp.info.update(_thisComp.items[0].data); // Calls patched update
                _thisComp.background(_thisComp.items[0].data); // Calls patched background
            }

            // Finalize build
             if(_thisComp.activity && typeof _thisComp.activity.loader === 'function'){
                  _thisComp.activity.loader(false); _thisComp.activity.toggle();
             } else { console.warn("Merged Plugin: this.activity reference missing in build finish."); }

        } catch (e) { console.error("Merged Plugin: Error in patched build logic", e); }
    }

    function modifiedCompAppendLogic(element) {
        var _thisComp = this; // 'this' is the main component instance
        try {
            if (element.ready) return; element.ready = true;
            var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: _thisComp.object.genres, object: _thisComp.object, card_wide: true, nomore: element.nomore });
            item.create();
            item.onDown = _thisComp.down.bind(_thisComp); item.onUp = _thisComp.up.bind(_thisComp); item.onBack = _thisComp.back.bind(_thisComp);
            item.onToggle = function () { _thisComp.active = _thisComp.items.indexOf(item); };
            if (_thisComp.onMore) item.onMore = _thisComp.onMore.bind(_thisComp);

            // Modified focus/hover handlers
            item.onFocus = function (elem) {
                if (!elem.method) elem.method = elem.name ? 'tv' : 'movie';
                if (_thisComp.info) _thisComp.info.update(elem); // Calls patched update
                _thisComp.background(elem); // Calls patched background
            };
            item.onHover = function (elem) {
                if (!elem.method) elem.method = elem.name ? 'tv' : 'movie';
                if (_thisComp.info) _thisComp.info.update(elem); // Calls patched update
                _thisComp.background(elem); // Calls patched background
            };
            if (_thisComp.info && typeof _thisComp.info.empty === 'function') item.onFocusMore = _thisComp.info.empty.bind(_thisComp.info);

            _thisComp.scroll.append(item.render()); _thisComp.items.push(item);
        } catch (e) { console.error("Merged Plugin: Error in patched append logic", e); }
    }

    function modifiedCompBackgroundLogic(elem) {
         var _thisComp = this; // 'this' is the main component instance
         try {
            if (!elem || !elem.backdrop_path) return;
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(_thisComp.background_timer);
            if (new_background == _thisComp.background_last) return;

            if (!_thisComp.background_img || !_thisComp.background_img.length) {
                _thisComp.background_img = _thisComp.html.find('.full-start__background');
                if (!_thisComp.background_img.length) return;
            }

            _thisComp.background_timer = setTimeout(function () {
                if (!_thisComp.background_img || !_thisComp.background_img.length) return;
                _thisComp.background_img.removeClass('loaded');
                if (_thisComp.background_img[0]) {
                    _thisComp.background_img[0].onload = () => { if (_thisComp.background_img) _thisComp.background_img.addClass('loaded'); };
                    _thisComp.background_img[0].onerror = () => { if (_thisComp.background_img) _thisComp.background_img.removeClass('loaded'); };
                    _thisComp.background_last = new_background;
                    setTimeout(() => { if (_thisComp.background_img && _thisComp.background_img[0]) { _thisComp.background_img[0].src = _thisComp.background_last; } }, 300);
                }
            }.bind(_thisComp), 1000);
        } catch (e) { console.error("Merged Plugin: Error in patched background logic", e); }
    }

    function modifiedCompDestroyLogic() {
         var _thisComp = this; // 'this' is the main component instance
         try {
            clearTimeout(_thisComp.background_timer);
            if(_thisComp.network) _thisComp.network.clear();
            Lampa.Arrays.destroy(_thisComp.items);
            if(_thisComp.scroll) _thisComp.scroll.destroy();
            if (_thisComp.info) _thisComp.info.destroy(); // Calls patched destroy
            if (_thisComp.html) _thisComp.html.remove();

            _thisComp.items = null; _thisComp.network = null; _thisComp.lezydata = null;
            _thisComp.info = null; _thisComp.html = null; _thisComp.background_timer = null;
            _thisComp.scroll = null; _thisComp.background_img = null; // Ensure img ref is cleared
        } catch (e) { console.error("Merged Plugin: Error in patched component destroy logic", e); }
    }

    // --- Wrapper and Initialization Logic ---
    let originalInteractionMainFactory = null;
    let pluginInitializationAttempted = false;
    let pluginInitializationSucceeded = false; // Use specific success flag

    function ourWrappedFactory(object) {
        let instance = null;
        try {
            if (!originalInteractionMainFactory) { throw new Error("Original factory not captured."); }
            instance = originalInteractionMainFactory(object);
        } catch (e) { console.error("Merged Plugin: Error calling original InteractionMain factory", e); return instance; }

        if (!instance) return instance;

        let conditionsMet = false;
        let isCorrectInstance = false;
        try {
            conditionsMet = (object.source == 'tmdb' || object.source == 'cub') && (window.innerWidth >= 767) && Lampa.Account.hasPremium() && (Lampa.Manifest.app_digital >= 153);
            if (instance.render) {
                 const renderedEl = instance.render();
                 isCorrectInstance = renderedEl && typeof renderedEl.hasClass === 'function' && renderedEl.hasClass(TARGET_CLASS);
            }
        } catch (e) { console.error("Merged Plugin: Error during identification checks", e); }

        if (conditionsMet && isCorrectInstance) {
            try {
                // Patch main component methods
                instance.build = modifiedCompBuildLogic.bind(instance);
                instance.append = modifiedCompAppendLogic.bind(instance);
                instance.background = modifiedCompBackgroundLogic.bind(instance);
                instance.destroy = modifiedCompDestroyLogic.bind(instance);

                // Store original create function constructor reference if available
                instance.originalCreate = instance.create;

                // The patched 'build' method now handles patching the 'info' sub-component internally.
                // console.log("Merged Plugin: Instance identified and methods prepared for patching within build.");
            } catch (e) {
                 console.error("Merged Plugin: Error preparing patches", e);
                 // Return original instance if setup fails
                  try{ return originalInteractionMainFactory(object); } catch(fallbackError){ return null; }
            }
        }
        return instance;
    }

    function initPlugin() {
        if (pluginInitializationSucceeded) return; // Already succeeded
        pluginInitializationAttempted = true; // Mark attempt

        // console.log("Merged Plugin: Initializing core wrapping logic...");
        if (typeof Lampa.InteractionMain === 'function') {
            originalInteractionMainFactory = Lampa.InteractionMain; // Capture potentially modified factory
            Lampa.InteractionMain = ourWrappedFactory; // Replace with our wrapper
            pluginInitializationSucceeded = true; // Mark success
            console.log("Merged Interface Plugin: Initialized and ready.");
        } else {
            console.error("Merged Interface Plugin: Lampa.InteractionMain not available or not a function at init time.");
        }
    }

    // --- Plugin Start ---
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            injectCSS(); // Inject CSS on app ready

            // Listen for activities to check for target interface
            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                if (pluginInitializationSucceeded || pluginInitializationAttempted) return; // Don't re-init or retry if attempt failed badly

                try {
                    if (activityEvent.activity && typeof activityEvent.activity.render === 'function') {
                         const activityRendered = activityEvent.activity.render();
                         // Use the more specific TARGET_INFO_ELEMENT_SELECTOR for confirmation
                         if (activityRendered && activityRendered.find(TARGET_INFO_ELEMENT_SELECTOR).length > 0) {
                             // Target element found! Initialize the plugin's wrapping logic.
                             initPlugin();
                         }
                    }
                } catch (error) {
                    console.error("Merged Plugin: Error in activity_ready listener check:", error);
                    pluginInitializationAttempted = true; // Prevent retries if check itself errors
                }
            });
        }
    });

})();
