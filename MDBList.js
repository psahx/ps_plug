// == Lampa Plugin: Merged New Interface Enhancements + MDBList Ratings ==
// Purpose: Enhances the specific 'new-interface' component (if used by Lampa)
//          by integrating MDBList ratings, adjusting styles, and applying
//          other modifications based on previously provided code examples.
// Strategy: Uses a "Wrap and Patch" approach for Lampa.InteractionMain,
//           initialized via listener + element check.
(function () {
    'use strict';

    // --- Check if Lampa is available ---
    // Perform early check for essential Lampa components
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error("Merged Interface Plugin: Required Lampa components are not available at script load.");
        return; // Stop execution if core Lampa is missing
    }

    // --- Constants ---
    const STYLE_ID = 'merged_new_interface_style_v2'; // Unique ID for the style tag (v2 for listener init)
    const TARGET_CLASS = 'new-interface';             // Class on the root element of the target component
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info'; // Unique element within the target interface

    // --- Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';

    // --- Plugin State (for MDBList Caching) ---
    let mdblistRatingsCache = {};
    let mdblistRatingsPending = {};

    // --- CSS Injection Function ---
    function injectCSS() {
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) return; // Prevent duplicate injection

            const css = `
            <style data-id="${STYLE_ID}">
                /* Height adjustment from modified CSS */
                .new-interface-info { height: 22.5em; } /* original was 24em */

                /* --- Rating Box Styles (Copied from Modified Interface code) --- */
                .new-interface .full-start__rate {
                    font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center;
                    vertical-align: middle; background-color: rgba(255, 255, 255, 0.12);
                    padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.5em; overflow: hidden; height: auto;
                }
                .new-interface .full-start__rate > div {
                    font-weight: normal; font-size: 1em; justify-content: center;
                    background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0.1em 0.3em;
                    border-radius: 0.3em; line-height: 1.3; order: 1; display: flex;
                    align-items: center; flex-shrink: 0;
                }
                 .rt-rating-item > div.rt-score { padding-left: 1.2em; padding-right: 1.2em; }
                 .placeholder-value { color: rgba(255, 255, 255, 0.6); }
                .rating-logo {
                    height: 1.1em; width: auto; max-width: 75px; vertical-align: middle;
                    order: 2; line-height: 0; flex-shrink: 0;
                }
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
                .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; gap: 0.5em 0; /* Added gap for wrapping */ }
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
            // console.log("Merged Interface Plugin: CSS Injected");
        } catch (e) {
            console.error("Merged Interface Plugin: Error injecting CSS", e);
        }
    }

    // --- Modified Method Logic (Extracted and adapted for patching) ---

    function modifiedUpdateLogic(data) {
        var _this = this; // 'this' will be the info panel instance
        try {
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            this.html.find('.new-interface-info__title').text(data.title);
            this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            delete mdblistRatingsCache[data.id];
            delete mdblistRatingsPending[data.id];

            if (window.MDBLIST_Fetcher && typeof window.MDBLIST_Fetcher.fetch === 'function' && data.id && data.method) {
                mdblistRatingsPending[data.id] = true;
                const fetchData = { id: data.id, method: data.method };

                window.MDBLIST_Fetcher.fetch(fetchData, function(mdblistResult) {
                    mdblistRatingsCache[data.id] = mdblistResult;
                    delete mdblistRatingsPending[data.id];

                    var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                    // Ensure 'this' context is still valid before drawing
                    if (_this && _this.loaded && _this.loaded[tmdb_url] && typeof _this.draw === 'function') {
                        _this.draw(_this.loaded[tmdb_url]);
                    }
                });
            } else if (!data.method) {
                // console.warn("Merged Interface Plugin: data.method missing in update, cannot fetch MDBList ratings.", data);
            }

            this.load(data); // Call patched load
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched update logic", e);
        }
    }

    function modifiedDrawLogic(data) {
         var _this = this; // 'this' will be the info panel instance
         try {
            var createYear = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [];
            var details = [];
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            if (createYear !== '0000') head.push('<span>' + createYear + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            var mdblistResult = mdblistRatingsCache[data.id];
            var imdbRating = '---', rtScoreDisplay = '--%', rtLogoUrl = '';

            if (mdblistResult) {
                if (mdblistResult.error === null) {
                    // IMDb
                    if (mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') {
                        imdbRating = parseFloat(mdblistResult.imdb).toFixed(1);
                    }
                    // Tomatoes
                    if (mdblistResult.tomatoes !== undefined && mdblistResult.tomatoes !== null && typeof mdblistResult.tomatoes === 'number') {
                        let score = mdblistResult.tomatoes;
                        rtLogoUrl = score >= 60 ? rtFreshLogoUrl : (score >= 0 ? rtRottenLogoUrl : '');
                        rtScoreDisplay = score >= 0 ? score + '%' : 'N/A';
                    }
                } else {
                    imdbRating = 'ERR'; // Indicate error for IMDb if fetch failed
                    // Optionally indicate error for RT too
                }
            }

            details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>');
            details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>');
            if (rtLogoUrl) { // Only add RT box if we have a valid score and logo
                 details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + rtScoreDisplay + '</div><img src="' + rtLogoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>');
            }

            if (data.genres && data.genres.length > 0) details.push(data.genres.map(item => Lampa.Utils.capitalizeFirstLetter(item.name)).join(' | '));
            if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');

            _this.html.find('.new-interface-info__head').empty().append(head.join(', '));
            _this.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched draw logic", e);
        }
    }

    function modifiedLoadLogic(data) {
        var _this = this; // 'this' will be the info panel instance
        try {
            clearTimeout(_this.timer);

            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

            if (_this.loaded && _this.loaded[url]) {
                 if (!_this.loaded[url].method) _this.loaded[url].method = data.name ? 'tv' : 'movie';
                 return _this.draw(_this.loaded[url]); // Call patched draw
            }

            // Use instance timer and network (assuming they exist)
            if (!_this.network) _this.network = new Lampa.Reguest(); // Ensure network exists

            _this.timer = setTimeout(function () {
                if (!_this.network || !_this.loaded || !_this.draw) return; // Check if instance/methods still valid
                _this.network.clear();
                _this.network.timeout(5000);
                _this.network.silent(url, function (movie) {
                    if (!_this.loaded || !_this.draw) return; // Check again after async
                    _this.loaded[url] = movie;
                    if (!movie.method) movie.method = data.name ? 'tv' : 'movie';
                    _this.draw(movie); // Call patched draw
                });
            }, 300);
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched load logic", e);
        }
    }

    function modifiedInfoDestroyLogic() {
         var _this = this; // 'this' will be the info panel instance
         try {
            if(_this.html) _this.html.remove();
            if(_this.network) _this.network.clear();
            clearTimeout(_this.timer);
            _this.loaded = {};
            _this.html = null;
            _this.network = null;
            _this.timer = null;

            // Global cache clear, replicating modified code's behavior
            // Consider if instance-specific cleanup of pending flags is needed instead.
            mdblistRatingsCache = {};
            mdblistRatingsPending = {};
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched info destroy logic", e);
        }
    }

    // --- Modified Methods for Main Component Instance ---

    function modifiedCompBuildLogic(data) {
        var _thisComp = this; // 'this' will be the main component instance
        try {
            _thisComp.lezydata = data;

            // Create info panel instance using original constructor
            if (typeof _thisComp.create === 'function') {
                _thisComp.info = new _thisComp.create(_thisComp.object);
                _thisComp.info.create();
            } else {
                console.error("Merged Plugin: Cannot find original 'create' constructor on component instance.");
                _thisComp.info = null;
            }

            // Patch the created info panel instance
            if (_thisComp.info) {
                 // Add necessary properties if missing from original 'create' execution
                 _thisComp.info.html = $(_thisComp.info.render());
                 _thisComp.info.loaded = typeof _thisComp.info.loaded === 'object' ? _thisComp.info.loaded : {};
                 _thisComp.info.network = _thisComp.info.network || new Lampa.Reguest();
                 _thisComp.info.timer = _thisComp.info.timer || null;

                 // Apply patches, binding to the info instance
                 _thisComp.info.update = modifiedUpdateLogic.bind(_thisComp.info);
                 _thisComp.info.draw = modifiedDrawLogic.bind(_thisComp.info);
                 _thisComp.info.load = modifiedLoadLogic.bind(_thisComp.info);
                 _thisComp.info.destroy = modifiedInfoDestroyLogic.bind(_thisComp.info);
                 // console.log("Merged Interface Plugin: Info panel instance patched within build.");
            }

            // Continue build... (using potentially patched methods like append/background indirectly)
            if (_thisComp.info) _thisComp.scroll.minus(_thisComp.info.render());
            data.slice(0, _thisComp.viewall ? data.length : 2).forEach(_thisComp.append.bind(_thisComp)); // Calls patched append
            if (_thisComp.info) _thisComp.html.append(_thisComp.info.render());
            _thisComp.html.append(_thisComp.scroll.render());

            if (_thisComp.newlampa) { // Original scroll setup logic
                Lampa.Layer.update(_thisComp.html);
                Lampa.Layer.visible(_thisComp.scroll.render(true));
                _thisComp.scroll.onEnd = _thisComp.loadNext.bind(_thisComp);
                _thisComp.scroll.onWheel = function (step) {
                    if (!Lampa.Controller.own(_thisComp)) _thisComp.start();
                    if (step > 0) _thisComp.down();
                    else if (_thisComp.active > 0) _thisComp.up();
                };
            }

            // Load initial item info (using potentially patched methods)
            if (_thisComp.items.length > 0 && _thisComp.items[0] && _thisComp.items[0].data && _thisComp.info) {
                _thisComp.active = 0;
                if (!_thisComp.items[0].data.method) _thisComp.items[0].data.method = _thisComp.items[0].data.name ? 'tv' : 'movie';
                _thisComp.info.update(_thisComp.items[0].data); // Calls patched update
                _thisComp.background(_thisComp.items[0].data); // Calls patched background
            }

            // Finalize build (original logic, check for existence of activity/loader)
             if(_thisComp.activity && typeof _thisComp.activity.loader === 'function'){
                  _thisComp.activity.loader(false);
                  _thisComp.activity.toggle();
             } else {
                  console.warn("Merged Interface Plugin: this.activity or this.activity.loader not found in patched build.");
             }

        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched build logic", e);
             // Attempt to call original finalize logic safely
             try {
                 if(_thisComp.activity && typeof _thisComp.activity.loader === 'function'){
                     _thisComp.activity.loader(false);
                     _thisComp.activity.toggle();
                 }
             } catch(finalError){}
        }
    }

    function modifiedCompAppendLogic(element) {
        var _thisComp = this; // 'this' will be the main component instance
        try {
            if (element.ready) return;
            element.ready = true;

            var item = new Lampa.InteractionLine(element, {
                url: element.url, card_small: true, cardClass: element.cardClass,
                genres: _thisComp.object.genres, object: _thisComp.object,
                card_wide: true, nomore: element.nomore
            });
            item.create();
            item.onDown = _thisComp.down.bind(_thisComp);
            item.onUp = _thisComp.up.bind(_thisComp);
            item.onBack = _thisComp.back.bind(_thisComp);
            item.onToggle = function () { _thisComp.active = _thisComp.items.indexOf(item); };
            if (_thisComp.onMore) item.onMore = _thisComp.onMore.bind(_thisComp);

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

            _thisComp.scroll.append(item.render());
            _thisComp.items.push(item);
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched append logic", e);
        }
    }

    function modifiedCompBackgroundLogic(elem) {
        var _thisComp = this; // 'this' will be the main component instance
        try {
            if (!elem || !elem.backdrop_path) return;

            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(_thisComp.background_timer);
            if (new_background == _thisComp.background_last) return;

             // Ensure background_img is a valid jQuery object
             if (!_thisComp.background_img || !_thisComp.background_img.length) {
                 _thisComp.background_img = _thisComp.html.find('.full-start__background');
                 if (!_thisComp.background_img.length) return; // Still not found, exit
             }


            _thisComp.background_timer = setTimeout(function () {
                if (!_thisComp.background_img || !_thisComp.background_img.length) return; // Check again inside timeout
                _thisComp.background_img.removeClass('loaded');

                if (_thisComp.background_img[0]) {
                    _thisComp.background_img[0].onload = () => {
                        if (_thisComp.background_img) _thisComp.background_img.addClass('loaded');
                    };
                    _thisComp.background_img[0].onerror = () => {
                        if (_thisComp.background_img) _thisComp.background_img.removeClass('loaded');
                    };
                    _thisComp.background_last = new_background;
                    setTimeout(() => {
                        if (_thisComp.background_img && _thisComp.background_img[0]) {
                            _thisComp.background_img[0].src = _thisComp.background_last;
                        }
                    }, 300);
                }
            }.bind(_thisComp), 1000);
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched background logic", e);
        }
    }

    function modifiedCompDestroyLogic() {
        var _thisComp = this; // 'this' will be the main component instance
        try {
            clearTimeout(_thisComp.background_timer);

            if(_thisComp.network) _thisComp.network.clear();
            Lampa.Arrays.destroy(_thisComp.items);
            if(_thisComp.scroll) _thisComp.scroll.destroy();
            if (_thisComp.info) _thisComp.info.destroy(); // Calls patched destroy
            if (_thisComp.html) _thisComp.html.remove();

            // Null assignments
            _thisComp.items = null;
            _thisComp.network = null;
            _thisComp.lezydata = null;
            _thisComp.info = null;
            _thisComp.html = null;
            _thisComp.background_timer = null;
            _thisComp.scroll = null;
        } catch (e) {
            console.error("Merged Interface Plugin: Error in patched component destroy logic", e);
        }
    }


    // --- Wrapper and Initialization Logic ---
    let originalInteractionMainFactory = null; // Stores the original factory function
    let pluginInitializationAttempted = false; // Flag to prevent multiple init attempts

    // This function replaces Lampa.InteractionMain
    function ourWrappedFactory(object) {
        let instance = null;
        try {
            // Ensure we have the original factory captured
            if (!originalInteractionMainFactory) {
                console.error("Merged Interface Plugin: Original factory not available in wrapper. Cannot create component.");
                return null;
            }
            // 1. Call the original factory
            instance = originalInteractionMainFactory(object);
        } catch (e) {
             console.error("Merged Interface Plugin: Error calling original InteractionMain factory", e);
             return instance; // Return null or partially created instance
        }

        if (!instance) return instance; // Original factory failed

        // 2. Perform Identification Checks
        let conditionsMet = false;
        let isCorrectInstance = false;

        try {
            conditionsMet = (object.source == 'tmdb' || object.source == 'cub') &&
                            (window.innerWidth >= 767) &&
                            Lampa.Account.hasPremium() &&
                            (Lampa.Manifest.app_digital >= 153);

            if (instance && typeof instance.render === 'function') {
                 try {
                      const renderedEl = instance.render(); // Call render once
                      // Check if it's a jQuery object and has the class
                      isCorrectInstance = renderedEl && typeof renderedEl.hasClass === 'function' && renderedEl.hasClass(TARGET_CLASS);
                 } catch (renderError){
                      console.error("Merged Interface Plugin: Error calling instance.render() for check", renderError);
                 }
            }
        } catch (e) {
             console.error("Merged Interface Plugin: Error during identification checks", e);
        }

        // 3. Patch Instance if Checks Pass
        if (conditionsMet && isCorrectInstance) {
            // console.log("Merged Interface Plugin: Target instance identified, applying patches...");
            try {
                // Patch methods directly on the component instance.
                // Ensure original methods exist before patching? Or just overwrite.
                // The 'build' method patch handles patching the 'info' sub-component.
                instance.build = modifiedCompBuildLogic.bind(instance);
                instance.append = modifiedCompAppendLogic.bind(instance);
                instance.background = modifiedCompBackgroundLogic.bind(instance);
                instance.destroy = modifiedCompDestroyLogic.bind(instance);
                // Store original 'create' method reference if needed by patched build
                // Assuming the original component structure makes 'create' available on the instance
                 if(typeof instance.create !== 'function'){
                      console.warn("Merged Plugin: Original 'create' method not found on instance during patching.");
                 }

                // console.log("Merged Interface Plugin: Instance patched successfully.");
            } catch (e) {
                 console.error("Merged Interface Plugin: Error applying patches", e);
                 // If patching fails, return the original un-patched instance
                  try{
                       return originalInteractionMainFactory(object);
                  } catch(fallbackError){
                       console.error("Merged Interface Plugin: Error calling original factory during fallback", fallbackError);
                       return null;
                  }
            }
        }

        // 4. Return the instance (original or patched)
        return instance;
    }

    // Function to perform the core initialization (capturing and wrapping)
    function initPlugin() {
        // Ensure this runs only once
        if (window.merged_interface_plugin_initialized) return;
        pluginInitializationAttempted = true; // Mark that we tried

        // console.log("Merged Interface Plugin: Initializing core...");

        // Capture the current Lampa.InteractionMain
        if (typeof Lampa.InteractionMain === 'function') {
            originalInteractionMainFactory = Lampa.InteractionMain;
        } else {
            console.error("Merged Interface Plugin: Lampa.InteractionMain is not a function at init time. Plugin disabled.");
            return; // Cannot proceed
        }

        // Replace Lampa.InteractionMain with our wrapper
        Lampa.InteractionMain = ourWrappedFactory;
        window.merged_interface_plugin_initialized = true; // Set success flag

        console.log("Merged Interface Plugin: Initialized and ready.");
    }


    // --- Plugin Start ---
    // Use Lampa Listener to trigger setup
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            // Inject CSS on app ready, regardless of interface used
            injectCSS();

            // Listen for activities becoming ready to check if our target is loaded
            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                // Prevent initialization if already done or attempted unsuccessfully
                if (window.merged_interface_plugin_initialized || pluginInitializationAttempted) {
                    return;
                }

                try {
                    // Check if the ready activity contains the target element's unique identifier
                    const activityRendered = activityEvent.activity.render();
                    if (activityRendered && activityRendered.find(TARGET_INFO_ELEMENT_SELECTOR).length > 0) {
                        // Target element found! Initialize the plugin's wrapping logic.
                        initPlugin();
                    }
                } catch (error) {
                    console.error("Merged Plugin: Error in activity_ready listener check:", error);
                     pluginInitializationAttempted = true; // Don't retry if check fails badly
                }
            });
        }
    });

    // Add language string if needed (safe check)
    if (!Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})();
