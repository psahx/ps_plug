// == New Interface Component with External Ratings Integration - MINIMAL CHANGE APPROACH ==
(function () {
    'use strict';

    // --- External Ratings State (GLOBAL within plugin scope) ---
    // Cache for external ratings results { tmdb_id: { kp: ..., imdb: ..., timestamp: ..., error: ... } }
    var externalRatingsCache = {};
    // Tracking for pending external ratings requests { tmdb_id: true }
    var externalRatingsPending = {};
    // ---------------------------------------------------------

    /**
     * Handles displaying detailed info for the focused item.
     * MODIFIED: To trigger external fetch and display results.
     */
    function create(object) { // Keep original parameters
        var html;
        var timer; // Timer for TMDB fetch delay
        var network = new Lampa.Reguest(); // Network instance for TMDB fetches
        var loaded = {}; // Original cache for *detailed* TMDB API results, keyed by API URL

        // Initialize the HTML structure for the info panel
        this.create = function () {
            // --- ORIGINAL create function ---
            html = $("<div class=\"new-interface-info\">\n                <div class=\"new-interface-info__body\">\n                    <div class=\"new-interface-info__head\"></div>\n                    <div class=\"new-interface-info__title\"></div>\n                    <div class=\"new-interface-info__details\"></div>\n                    <div class=\"new-interface-info__description\"></div>\n                </div>\n            </div>");
            // --- END ORIGINAL ---

            // **ADDED**: Add specific containers within details for better layout control (minimal DOM change)
            // If this causes issues, we can revert to adding directly to .new-interface-info__details
            html.find('.new-interface-info__details').html('<div class="new-interface-info__ratings"></div><div class="new-interface-info__other-details"></div>');
        };

        /**
         * Update the info panel when a new item is focused/hovered.
         * @param {object} data - Basic movie/TV data from the list item.
         */
        this.update = function (data) {
            var _this = this; // Capture 'this' for callbacks

            // --- ORIGINAL update function PART 1 ---
            html.find('.new-interface-info__head,.new-interface-info__details').text('---'); // Original placeholder logic
            html.find('.new-interface-info__title').text(data.title);
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
            // --- END ORIGINAL ---

            // **ADDED**: Clear specific containers if they exist from 'create' modification
            html.find('.new-interface-info__ratings').empty();
            html.find('.new-interface-info__other-details').empty();


            // **ADDED**: Trigger External Ratings Fetch
            // Check if fetcher exists and fetch is not already pending/complete for this ID
            if (window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function' && data.id && !externalRatingsPending[data.id] && !externalRatingsCache[data.id]) {
                externalRatingsPending[data.id] = true;

                // Optional: Add placeholder to the ratings container
                html.find('.new-interface-info__ratings').html('<span class="new-ratings-loading">' + Lampa.Lang.translate('loading_ratings') + '</span>');

                window.ExternalRatingsFetcher.fetch(data, function(externalRatingsResult) {
                    externalRatingsCache[data.id] = externalRatingsResult; // Store result
                    delete externalRatingsPending[data.id]; // Clear pending flag

                    // Check if detailed TMDB data already loaded (needed to potentially redraw)
                    var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                    if (loaded[tmdb_url]) {
                        // Re-draw immediately ONLY if TMDB data is already loaded,
                        // otherwise 'load' will handle the drawing.
                        _this.draw(loaded[tmdb_url]);
                    }
                });
            }
            // --- END ADDED ---

            // --- ORIGINAL update function PART 2 ---
            this.load(data); // Call original load function
            // --- END ORIGINAL ---
        };

        /**
         * Draw the detailed information after TMDB data is loaded.
         * @param {object} detailedData - Detailed movie/TV data from TMDB API.
         */
        this.draw = function (detailedData) {
            // --- ORIGINAL draw function PART 1 (variable setup) ---
            var create = ((detailedData.release_date || detailedData.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((detailedData.vote_average || 0) + '').toFixed(1);
            var head = [];
            // *** MODIFIED ***: Use separate arrays for ratings vs other details
            var details_ratings = []; // For TMDB, KP, IMDB
            var details_other = [];   // For genres, runtime, PG
            var countries = Lampa.Api.sources.tmdb.parseCountries(detailedData);
            var pg = Lampa.Api.sources.tmdb.parsePG(detailedData);
            // --- END ORIGINAL ---

            // --- ORIGINAL draw function PART 2 (populate head) ---
            if (create !== '0000') head.push('<span>' + create + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));
            // --- END ORIGINAL ---

            // --- ORIGINAL draw function PART 3 (populate details - MODIFIED FOR SEPARATION) ---
            // 1. TMDB Rating (Original logic, pushed to details_ratings)
            if (vote > 0) {
                details_ratings.push('<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>');
            }

            // **ADDED**: KP and IMDB Ratings
            var external = externalRatingsCache[detailedData.id];
            if (external) {
                if (external.kp > 0) {
                    // Use exact same structure as TMDB rating line
                    details_ratings.push('<div class="full-start__rate"><div>' + parseFloat(external.kp).toFixed(1) + '</div><div>KP</div></div>');
                }
                if (external.imdb > 0) {
                    // Use exact same structure as TMDB rating line
                    details_ratings.push('<div class="full-start__rate"><div>' + parseFloat(external.imdb).toFixed(1) + '</div><div>IMDB</div></div>');
                }
            } else if (externalRatingsPending[detailedData.id]) {
                 // Optional: Show loading if fetch is still pending when draw runs
                 details_ratings.push('<span class="new-ratings-loading">' + Lampa.Lang.translate('loading_ratings') + '</span>');
            }
            // --- END ADDED ---


            // 2. Other details (Original logic, pushed to details_other)
            if (detailedData.genres && detailedData.genres.length > 0) {
                 details_other.push(detailedData.genres.map(function (item) {
                    return Lampa.Utils.capitalizeFirstLetter(item.name);
                 }).join(' | '));
            }
            if (detailedData.runtime) {
                 details_other.push(Lampa.Utils.secondsToTime(detailedData.runtime * 60, true));
            }
            if (pg) {
                 details_other.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');
            }
            // --- END ORIGINAL (modified target array) ---


            // --- ORIGINAL draw function PART 4 (update HTML - MODIFIED FOR SEPARATION) ---
            html.find('.new-interface-info__head').empty().append(head.join(', '));

            // **MODIFIED**: Populate the separate containers
            html.find('.new-interface-info__ratings').html(details_ratings.join(' ')); // Join with space
            html.find('.new-interface-info__other-details').html(details_other.join('<span class="new-interface-info__split">&#9679;</span>')); // Join with original separator

            // **ADDED**: Ensure loading indicator is removed if present and no longer needed
            if (!externalRatingsPending[detailedData.id]) {
               html.find('.new-ratings-loading').remove();
            }
            // --- END ORIGINAL (modified) ---
        };

        /**
         * Load detailed data from TMDB API.
         * ORIGINAL FUNCTION - UNCHANGED
         * @param {object} data - Basic movie/TV data (used for ID and type).
         */
        this.load = function (data) {
            var _this = this;

            clearTimeout(timer);
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

            // Check TMDB cache first (Original logic)
            if (loaded[url]) return this.draw(loaded[url]); // Use cached TMDB data, draw will check external cache

            // Fetch TMDB data (Original logic)
            timer = setTimeout(function () {
                network.clear();
                network.timeout(5000);
                network.silent(url, function (movie) { // Success
                    loaded[url] = movie; // Cache TMDB result
                    _this.draw(movie); // Draw using TMDB data, draw will check external cache
                }, function(xhr, status) { // Error (Original didn't explicitly have this, added for robustness based on previous code, can be removed if strictly needed)
                    // console.error("NewInterface: Failed to load TMDB details:", status);
                    // Potentially clear fields or show minimal info
                     html.find('.new-interface-info__head').text(Lampa.Lang.translate('error'));
                     html.find('.new-interface-info__details').empty(); // Clear details on error
                });
            }, 300);
        };

        // --- ORIGINAL render, empty, destroy functions ---
        this.render = function () {
            return html;
        };

        this.empty = function () {}; // Original

        this.destroy = function () {
            clearTimeout(timer);
            network.clear();
            if (html) {
                html.remove();
            }
            // **ADDED**: Clear global cache on destroy
            externalRatingsCache = {};
            externalRatingsPending = {};
            // --- End Added ---
            loaded = {}; // Clear TMDB cache too
            html = null;
        };
        // --- END ORIGINAL ---
    }


    /**
     * Main component managing the list interaction and integrating the info panel.
     * ORIGINAL FUNCTION - UNCHANGED (except for instantiation of modified 'create')
     */
    function component(object) {
        var network = new Lampa.Reguest(); // Original
        var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); // Original
        var items = []; // Original
        var html = $('<div class="new-interface"><img class="full-start__background"></div>'); // Original
        var active = 0; // Original
        var newlampa = Lampa.Manifest.app_digital >= 166; // Original
        var info; // Instance of 'create'
        var lezydata; // Original
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; // Original
        var background_img = html.find('.full-start__background'); // Original
        var background_last = ''; // Original
        var background_timer; // Original

        // --- ORIGINAL create, empty, loadNext, push ---
        this.create = function () {};
        this.empty = function () { /* Original empty code */
            var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); html.append(empty.render(button)); this.start = empty.start; this.activity.loader(false); this.activity.toggle();
        };
        this.loadNext = function () { /* Original loadNext code */
            var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; new_data.forEach(_this.append.bind(_this)); Lampa.Layer.visible(items[active + 1].render(true)); }, function () { _this.next_wait = false; }); }
        };
        this.push = function () {};
        // --- END ORIGINAL ---


        this.build = function (data) {
            var _this2 = this;
            lezydata = data; // Original

            // **MODIFIED**: Instantiate our modified 'create'
            info = new create(object);
            info.create(); // Call create's init

            // --- ORIGINAL build logic ---
            scroll.minus(info.render());
            data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); // Calls ORIGINAL append
            html.append(info.render());
            html.append(scroll.render());

            if (newlampa) {
                Lampa.Layer.update(html);
                Lampa.Layer.visible(scroll.render(true));
                scroll.onEnd = this.loadNext.bind(this);
                scroll.onWheel = function (step) {
                    if (!Lampa.Controller.own(_this2)) _this2.start();
                    if (step > 0) _this2.down();
                    else if (active > 0) _this2.up();
                };
            }
            // --- END ORIGINAL ---

            // **ADDED**: Trigger update for the initially focused item (index 0)
            // This ensures details load when the view first appears.
            // Check if this logic existed or is needed based on original behavior.
             if (items.length > 0 && items[0] && items[0].data) {
                 active = 0; // Ensure active index is 0
                 // Don't call items[active].toggle() here, let 'start' handle initial focus
                 info.update(items[active].data); // Trigger data load
                 this.background(items[active].data); // Trigger background update
             }

            // --- ORIGINAL build logic ---
            this.activity.loader(false);
            this.activity.toggle();
            // --- END ORIGINAL ---
        };


        this.background = function (elem) { /* Original background code */
            if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (new_background == background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); }, 1000);
        };


        /**
         * Append a single item to the list.
         * ORIGINAL FUNCTION - UNCHANGED (Removed the faulty .some check)
         */
        this.append = function (element) {
            // Original readiness check
            if (element.ready) return;

            var _this3 = this;
            element.ready = true; // Mark element as processed

            var item = new Lampa.InteractionLine(element, { // Original item creation
                url: element.url,
                card_small: true,
                cardClass: element.cardClass,
                genres: object.genres,
                object: object,
                card_wide: true,
                nomore: element.nomore
            });
            item.create(); // Original

            // --- Original Item Interactions ---
            item.onDown = this.down.bind(this);
            item.onUp = this.up.bind(this);
            item.onBack = this.back.bind(this);
            item.onToggle = function () { active = items.indexOf(item); };
            if (this.onMore) item.onMore = this.onMore.bind(this);

            // Original Focus/Hover handlers calling info.update()
            item.onFocus = function (elem) {
                info.update(elem); // Calls the modified update function in 'create'
                _this3.background(elem);
            };
            item.onHover = function (elem) {
                info.update(elem); // Calls the modified update function in 'create'
                _this3.background(elem);
            };
            item.onFocusMore = info.empty.bind(info);
            // --- End Original Item Interactions ---

            scroll.append(item.render()); // Original
            items.push(item); // Original
        };


        // --- ORIGINAL back, down, up, start, refresh, pause, stop, render, destroy ---
        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); };
        this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } };
        this.start = function () { /* Original start code */
             var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, back: this.back }); Lampa.Controller.toggle('content');
        };
        this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () { /* Original destroy code */
             clearTimeout(background_timer); network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); /* Calls modified destroy in 'create' */ if (html) html.remove(); items = null; network = null; lezydata = null; info = null; html = null;
        };
        // --- END ORIGINAL ---
    }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        // **ADDED**: Check for Lampa readiness
        if (!window.Lampa || !Lampa.Reguest || !Lampa.TMDB || !Lampa.Api || !Lampa.Utils || !Lampa.Storage || !Lampa.Scroll || !Lampa.InteractionLine || !Lampa.Template || !Lampa.Lang) {
             console.error("NewInterface Plugin: Missing required Lampa components.");
             return;
        }

        // **ADDED**: Language strings
         Lampa.Lang.add({
             loading_ratings: { en: 'Loading ratings...', ru: 'Загрузка рейтингов...' },
             ratings_not_found: { en: 'Ratings not found', ru: 'Рейтинги не найдены' },
             error: { en: 'Error', ru: 'Ошибка' } // Added generic error for TMDB load fail
         });

        // --- Original Plugin Activation Logic ---
        window.plugin_interface_ready = true;
        var old_interface = Lampa.InteractionMain;
        var new_interface = component; // Use our component (which uses modified 'create')

        Lampa.InteractionMain = function (object) {
            var use = new_interface;
            // Original conditions for using the interface
            if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface;
            if (window.innerWidth < 767) use = old_interface;
            if (!Lampa.Account.hasPremium()) use = old_interface;
            if (Lampa.Manifest.app_digital < 153) use = old_interface;
            return new use(object);
        };
        // --- END ORIGINAL ---

        // **ADDED**: Inject CSS styles only once
        var style_id = 'new_interface_style_with_ratings_minimal'; // Unique ID
        if (!$('style[data-id="' + style_id + '"]').length) {
            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            /* Minimal CSS additions/modifications */
            .new-interface-info__details {
                display: flex;
                flex-direction: column; /* Stack ratings and other details */
                align-items: flex-start;
                /* Retain original bottom margin */
                margin-bottom: 1.6em;
                font-size: 1.1em;
                 min-height: 3em; /* Ensure enough space */
            }
            .new-interface-info__ratings {
                display: flex;
                flex-wrap: wrap;
                gap: 0.8em; /* Space between rating blocks */
                margin-bottom: 0.6em; /* Space below ratings */
                min-height: 1.4em; /* Min height for the rating row */
            }
            .new-interface-info__other-details {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0 0.5em; /* Horizontal gap for items like genre|runtime */
                min-height: 1.4em; /* Min height for the details row */
            }
            /* Use original rating style if possible, maybe slightly adjusted */
            .full-start__rate {
                /* Re-use original styles as much as possible */
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 0.4em;
                background-color: rgba(255, 255, 255, 0.05);
                padding: 0.2em 0.5em;
                border-radius: 3px;
                white-space: nowrap;
                /* Ensure original margin is handled by gap now */
                margin-right: 0;
            }
             .full-start__rate > div:first-child { font-weight: 600; }
             .full-start__rate > div:last-child { font-size: 0.7em; opacity: 0.8; text-transform: uppercase; }

            /* Loading indicator style */
            .new-ratings-loading { font-size: 0.9em; opacity: 0.7; padding: 0.2em 0; }

            /* Original split style */
            .new-interface-info__split { margin: 0 0.5em; font-size: 0.7em; opacity: 0.5; }

            /* Include other necessary base styles from original to ensure layout */
             .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
             .new-interface-info__body { width: 80%; padding-top: 1.1em; }
             .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1.2em; }
             .new-interface-info__head span { color: #fff; }
             .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
             .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }

            </style>
            `);
            $('body').append(Lampa.Template.get(style_id, {}, true));
        }
    }

    // --- Initialization Execution ---
    // **ADDED**: Ensure Lampa is ready before starting the plugin
    if (window.Lampa && Lampa.Utils) {
         if (!window.plugin_interface_ready) {
             startPlugin();
         }
    } else {
        document.addEventListener('lambda:loaded', function() {
             if (!window.plugin_interface_ready) {
                 startPlugin();
             }
        }, { once: true });
    }

})();
