// == Lampa Plugin: Merged New Interface Enhancements + MDBList Ratings ==
// Purpose: Enhances the specific 'new-interface' component (if used by Lampa)
//          by integrating MDBList ratings, adjusting styles, and applying
//          other modifications based on previously provided code examples.
// Strategy: Uses a "Wrap and Patch" approach for Lampa.InteractionMain.
(function () {
    'use strict';

    // --- Check if Lampa is available ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error("Merged Interface Plugin: Required Lampa components are not available.");
        return;
    }

    // --- Constants ---
    const STYLE_ID = 'merged_new_interface_style_v1'; // Unique ID for the style tag
    const TARGET_CLASS = 'new-interface'; // Class to identify the target component instance

    // --- Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';

    // --- Plugin State (for MDBList Caching) ---
    // These variables will be shared across all patched instances via closure
    let mdblistRatingsCache = {};
    let mdblistRatingsPending = {};

    // --- CSS Injection Function ---
    function injectCSS() {
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) return;

            // CSS rules taken directly from the 'Modified Interface' provided code block
            const css = `
            <style data-id="${STYLE_ID}">
                /* Height adjustment from modified CSS */
                .new-interface-info { height: 22.5em; } /* original was 24em */

                /* --- Rating Box Styles (Copied from Modified Interface code) --- */
                .new-interface .full-start__rate {
                    font-size: 1.3em;
                    margin-right: 0em; /* modified was 1em */
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
                .new-interface .full-start__rate > div {
                    font-weight: normal;
                    font-size: 1em;
                    justify-content: center;
                    background-color: rgba(0, 0, 0, 0.4); /* Darker background */
                    color: #ffffff;
                    padding: 0.1em 0.3em;     /* ** MODIFIED: Narrower L/R padding (was 0.5em) ** */
                    border-radius: 0.3em;
                    line-height: 1.3;
                    order: 1;
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }
                 .rt-rating-item > div.rt-score {
                     padding-left: 1.2em;  /* ** MODIFIED: Wider L padding (was 1em) ** */
                     padding-right: 1.2em; /* ** MODIFIED: Wider R padding (was 1em) ** */
                 }
                 .placeholder-value { /* Added for clarity if needed */
                     color: rgba(255, 255, 255, 0.6);
                 }
                .rating-logo {
                    height: 1.1em;
                    width: auto;
                    max-width: 75px; /* changed from 55 */
                    vertical-align: middle;
                    order: 2;
                    line-height: 0;
                    flex-shrink: 0; /* Prevent logos from shrinking */
                }
                .tmdb-logo { height: 0.9em; }
                .rt-logo { height: 1.1em; }
                /* --- End Rating Box Styles --- */

                /* Base styles (Copied from Modified Interface code) */
                 .new-interface .card--small.card--wide { width: 18.3em; }
                 .new-interface-info { position: relative; padding: 1.5em; } /* Height adjusted above */
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
    // These functions will be bound to the specific instance when patching

    function modifiedUpdateLogic(data) {
        var _this = this; // Refers to the info panel instance ('this.info')

        // Basic UI updates (from original logic)
        this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
        this.html.find('.new-interface-info__title').text(data.title);
        this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
        Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

        // MDBList Cache/Pending Logic
        delete mdblistRatingsCache[data.id];
        delete mdblistRatingsPending[data.id];

        // MDBList Fetcher Integration (Requires MDBLIST_Fetcher plugin to be loaded)
        if (window.MDBLIST_Fetcher && typeof window.MDBLIST_Fetcher.fetch === 'function' && data.id && data.method) {
            mdblistRatingsPending[data.id] = true;
            // Prepare data for fetcher (assuming it needs id and method)
            const fetchData = { id: data.id, method: data.method };

            window.MDBLIST_Fetcher.fetch(fetchData, function(mdblistResult) {
                mdblistRatingsCache[data.id] = mdblistResult; // Use plugin's cache
                delete mdblistRatingsPending[data.id]; // Use plugin's pending state

                // Check if the main TMDB data (`this.loaded`) has been populated by `this.load`
                var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                if (_this.loaded && _this.loaded[tmdb_url]) {
                    // console.log("Merged Interface Plugin: MDBList fetched, TMDB loaded, re-drawing info.");
                    _this.draw(_this.loaded[tmdb_url]); // Call the patched draw method
                } else {
                    // console.log("Merged Interface Plugin: MDBList fetched, but TMDB not loaded yet for info.");
                }
            });
        } else if (!data.method) {
            // console.warn("Merged Interface Plugin: data.method missing in update, cannot fetch MDBList ratings.", data);
        }

        // Trigger original TMDB load logic
        this.load(data); // Call the patched load method
    }

    function modifiedDrawLogic(data) {
        var _this = this; // Refers to the info panel instance ('this.info')

        // Original parsing logic
        var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
        var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
        var head = [];
        var details = [];
        var countries = Lampa.Api.sources.tmdb.parseCountries(data);
        var pg = Lampa.Api.sources.tmdb.parsePG(data);

        if (create !== '0000') head.push('<span>' + create + '</span>');
        if (countries.length > 0) head.push(countries.join(', '));

        // Get MDBList result from the plugin's cache
        var mdblistResult = mdblistRatingsCache[data.id];

        // Build ratings HTML
        var imdbRating = '---';
        if (mdblistResult && mdblistResult.error === null && mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') {
             imdbRating = parseFloat(mdblistResult.imdb).toFixed(1);
        } else if (mdblistResult && mdblistResult.error) { imdbRating = 'ERR'; }
        details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>');

        details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>');

        if (mdblistResult && mdblistResult.error === null && mdblistResult.tomatoes !== undefined && mdblistResult.tomatoes !== null && typeof mdblistResult.tomatoes === 'number') {
            let score = mdblistResult.tomatoes;
            let logoUrl = score >= 60 ? rtFreshLogoUrl : (score >= 0 ? rtRottenLogoUrl : '');
            let scoreDisplay = score >= 0 ? score + '%' : 'N/A';
            if (logoUrl) {
                details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + scoreDisplay + '</div><img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>');
            }
        } else {
             // Optional: Add RT placeholder if expected but missing/error
             // details.push('<div class="full-start__rate rt-rating-item"><div class="placeholder-value rt-score">--%</div><img src="'+rtFreshLogoUrl+'" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>');
        }

        // Add other details (Genres, Runtime, PG)
        if (data.genres && data.genres.length > 0) details.push(data.genres.map(item => Lampa.Utils.capitalizeFirstLetter(item.name)).join(' | '));
        if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
        if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');

        // Update DOM
        _this.html.find('.new-interface-info__head').empty().append(head.join(', '));
        _this.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>')); // Use empty().html() for cleaner update
    }

    function modifiedLoadLogic(data) {
        var _this = this; // Refers to the info panel instance ('this.info')

        clearTimeout(_this.timer);

        var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

        if (_this.loaded && _this.loaded[url]) {
             if (!_this.loaded[url].method) _this.loaded[url].method = data.name ? 'tv' : 'movie';
             return _this.draw(_this.loaded[url]); // Call patched draw
        }

        _this.timer = setTimeout(function () {
            if (!_this.network) return; // Instance might be destroyed
            _this.network.clear();
            _this.network.timeout(5000);
            _this.network.silent(url, function (movie) {
                if (!_this.loaded || !_this.draw) return; // Instance might be destroyed
                _this.loaded[url] = movie;
                if (!movie.method) movie.method = data.name ? 'tv' : 'movie';
                _this.draw(movie); // Call patched draw
            });
        }, 300);
    }

    function modifiedInfoDestroyLogic() {
        var _this = this; // Refers to the info panel instance ('this.info')

        // Original cleanup + checks
        if(_this.html) _this.html.remove();
        if(_this.network) _this.network.clear();
        clearTimeout(_this.timer);
        _this.loaded = {};
        _this.html = null;
        _this.network = null; // Assuming network was instance-specific
        _this.timer = null;

        // Clear relevant global plugin state if needed
        // Replicating the modified code's behavior of clearing global cache on any info destroy.
        // Consider if this is truly desired vs. more granular cleanup.
        mdblistRatingsCache = {};
        mdblistRatingsPending = {};
        // console.log("Merged Interface Plugin: Global MDBList cache cleared on info panel destroy.");
    }

    // --- Modified Methods for Main Component Instance ---

    function modifiedCompBuildLogic(data) {
        var _thisComp = this; // Refers to the main component instance

        // Standard build setup (from original)
        _thisComp.lezydata = data;

        // Create the info panel instance using the original constructor stored on 'this'
        // Patching happens *after* creation here.
        if (typeof _thisComp.create === 'function') {
            _thisComp.info = new _thisComp.create(_thisComp.object);
            _thisComp.info.create(); // Create HTML structure
        } else {
            console.error("Merged Plugin: Cannot find original 'create' constructor on component instance.");
            _thisComp.info = null; // Prevent errors later
        }

        // **Patch the info panel instance**
        if (_thisComp.info) {
            try {
                 // Store necessary refs if needed by patched methods
                 _thisComp.info.html = $(_thisComp.info.render());
                 _thisComp.info.loaded = {};
                 _thisComp.info.network = new Lampa.Reguest(); // Give instance its own network object
                 _thisComp.info.timer = null;

                 // Apply patches
                 _thisComp.info.update = modifiedUpdateLogic.bind(_thisComp.info);
                 _thisComp.info.draw = modifiedDrawLogic.bind(_thisComp.info);
                 _thisComp.info.load = modifiedLoadLogic.bind(_thisComp.info);
                 _thisComp.info.destroy = modifiedInfoDestroyLogic.bind(_thisComp.info);
                 // console.log("Merged Interface Plugin: Info panel instance patched.");
            } catch(patchError) {
                 console.error("Merged Interface Plugin: Error patching info panel instance.", patchError);
                 // Potentially revert to original methods or handle error
                 _thisComp.info = null; // Nullify if patching failed badly
            }
        }

        // Continue build process...
        if (_thisComp.info) _thisComp.scroll.minus(_thisComp.info.render()); // Use potentially patched info

        // Use the already patched 'append' method (patched on instance before build is called)
        data.slice(0, _thisComp.viewall ? data.length : 2).forEach(_thisComp.append.bind(_thisComp));

        if (_thisComp.info) _thisComp.html.append(_thisComp.info.render()); // Use potentially patched info
        _thisComp.html.append(_thisComp.scroll.render());

        // New Lampa Layer/Scroll setup (from original)
        if (_thisComp.newlampa) {
            Lampa.Layer.update(_thisComp.html);
            Lampa.Layer.visible(_thisComp.scroll.render(true));
            _thisComp.scroll.onEnd = _thisComp.loadNext.bind(_thisComp);
            _thisComp.scroll.onWheel = function (step) {
                if (!Lampa.Controller.own(_thisComp)) _thisComp.start();
                if (step > 0) _thisComp.down();
                else if (_thisComp.active > 0) _thisComp.up();
            };
        }

        // Load initial item info (from modified code)
        if (_thisComp.items.length > 0 && _thisComp.items[0] && _thisComp.items[0].data && _thisComp.info) {
            _thisComp.active = 0;
            if (!_thisComp.items[0].data.method) _thisComp.items[0].data.method = _thisComp.items[0].data.name ? 'tv' : 'movie';
             // Call the *patched* update method
            _thisComp.info.update(_thisComp.items[0].data);
             // Call the *patched* background method
            _thisComp.background(_thisComp.items[0].data);
        }

        _thisComp.activity.loader(false);
        _thisComp.activity.toggle();
    }

    function modifiedCompAppendLogic(element) {
         var _thisComp = this; // Refers to the main component instance

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

         // Modified focus/hover handlers
         item.onFocus = function (elem) {
             if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; // Ensure method
             if (_thisComp.info) _thisComp.info.update(elem); // Call patched update
             _thisComp.background(elem); // Call patched background
         };
         item.onHover = function (elem) {
             if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; // Ensure method
             if (_thisComp.info) _thisComp.info.update(elem); // Call patched update
             _thisComp.background(elem); // Call patched background
         };

         if (_thisComp.info) item.onFocusMore = _thisComp.info.empty.bind(_thisComp.info);

         _thisComp.scroll.append(item.render());
         _thisComp.items.push(item);
    }

    function modifiedCompBackgroundLogic(elem) {
        var _thisComp = this; // Refers to the main component instance

        // Added checks (from modified code)
        if (!elem || !elem.backdrop_path) return;

        var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
        clearTimeout(_thisComp.background_timer);
        if (new_background == _thisComp.background_last) return;

        _thisComp.background_timer = setTimeout(function () {
            if (!_thisComp.background_img) return;
            _thisComp.background_img.removeClass('loaded');

            if (_thisComp.background_img[0]) {
                 // Use arrow functions or bind to preserve 'this' context correctly
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
        }.bind(_thisComp), 1000); // Keep bind here for the outer setTimeout
    }

    function modifiedCompDestroyLogic() {
        var _thisComp = this; // Refers to the main component instance

        // Added cleanup (from modified code)
        clearTimeout(_thisComp.background_timer);

        // Original cleanup
        if(_thisComp.network) _thisComp.network.clear();
        Lampa.Arrays.destroy(_thisComp.items);
        if(_thisComp.scroll) _thisComp.scroll.destroy();
        // Call the *patched* destroy method of the info panel instance
        if (_thisComp.info) _thisComp.info.destroy();
        if (_thisComp.html) _thisComp.html.remove();

        // Added null assignments (from modified code)
        _thisComp.items = null;
        _thisComp.network = null;
        _thisComp.lezydata = null;
        _thisComp.info = null;
        _thisComp.html = null;
        _thisComp.background_timer = null; // Ensure timer ID is cleared
        _thisComp.scroll = null; // Assuming scroll should be nulled too
         // console.log("Merged Interface Plugin: Component instance destroyed.");
    }

    // --- Wrapper and Initialization ---
    let originalInteractionMainFactory = null; // Stores the original factory function

    // This function replaces Lampa.InteractionMain
    function ourWrappedFactory(object) {
        // Ensure we have captured the original factory
        if (!originalInteractionMainFactory) {
            console.error("Merged Interface Plugin: Original Lampa.InteractionMain factory not captured during init.");
            // Fallback to current Lampa.InteractionMain if possible, but this indicates an init issue.
            originalInteractionMainFactory = window.Lampa.InteractionMain;
             if(typeof originalInteractionMainFactory !== 'function') {
                 console.error("Merged Interface Plugin: Cannot proceed without original factory.");
                 return null; // Cannot create instance
             }
        }

        let instance = null;
        try {
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
            // Predictive checks (mirrors logic from original script's wrapper)
            conditionsMet = (object.source == 'tmdb' || object.source == 'cub') &&
                            (window.innerWidth >= 767) &&
                            Lampa.Account.hasPremium() &&
                            (Lampa.Manifest.app_digital >= 153);

            // Verification check using class name
            if (instance && typeof instance.render === 'function') {
                 // Use try-catch for render() call just in case
                 try {
                      isCorrectInstance = $(instance.render()).hasClass(TARGET_CLASS);
                 } catch (renderError){
                      console.error("Merged Interface Plugin: Error calling instance.render() for check", renderError);
                      isCorrectInstance = false;
                 }
            }
        } catch (e) {
             console.error("Merged Interface Plugin: Error during identification checks", e);
             conditionsMet = false; // Fail safe
             isCorrectInstance = false;
        }

        // 3. Patch Instance if Checks Pass
        if (conditionsMet && isCorrectInstance) {
            // console.log("Merged Interface Plugin: Target instance identified, applying patches...");
            try {
                // Patch main component methods first
                // We bind the modified logic functions to the instance
                instance.build = modifiedCompBuildLogic.bind(instance);
                instance.append = modifiedCompAppendLogic.bind(instance);
                instance.background = modifiedCompBackgroundLogic.bind(instance);
                instance.destroy = modifiedCompDestroyLogic.bind(instance);

                // The 'build' method itself now handles patching the 'info' sub-component
                // instance immediately after creating it.

                // console.log("Merged Interface Plugin: Instance patched successfully.");

            } catch (e) {
                 console.error("Merged Interface Plugin: Error applying patches", e);
                 // If patching fails, return the original un-patched instance
                  try{
                       return originalInteractionMainFactory(object);
                  } catch(fallbackError){
                       console.error("Merged Interface Plugin: Error calling original factory during fallback", fallbackError);
                       return null; // Give up if fallback fails
                  }
            }
        } else {
             // console.log("Merged Interface Plugin: Conditions not met or instance mismatch, using original.");
        }

        // 4. Return the instance (original or patched)
        return instance;
    }

    // Function to perform the initialization
    function initPlugin() {
        // Ensure this runs only once
        if (window.merged_interface_plugin_initialized) return;

        // Capture the current Lampa.InteractionMain (could be default or set by original script)
        if (typeof Lampa.InteractionMain === 'function') {
            originalInteractionMainFactory = Lampa.InteractionMain;
        } else {
            console.error("Merged Interface Plugin: Lampa.InteractionMain is not a function at init time. Plugin disabled.");
            return; // Cannot proceed
        }

        // Replace Lampa.InteractionMain with our wrapper
        Lampa.InteractionMain = ourWrappedFactory;
        window.merged_interface_plugin_initialized = true; // Set flag

        console.log("Merged Interface Plugin: Initialized and ready.");
    }


    // --- Plugin Start ---
    // Use Lampa Listener to ensure Lampa core is ready and other plugins (like original script) have likely run
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            injectCSS();  // Inject styles first
            initPlugin(); // Then setup the wrapping/patching
        }
    });

    // Add language string if needed (safe check)
    if (!Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})();
