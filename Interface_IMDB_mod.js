// == New Interface Component with External Ratings Integration ==
(function () {
    'use strict';

    // Cache for external ratings results { tmdb_id: { kp: ..., imdb: ..., timestamp: ..., error: ... } }
    var externalRatingsCache = {};
    // Tracking for pending external ratings requests { tmdb_id: true }
    var externalRatingsPending = {};

    /**
     * Handles displaying detailed info for the focused item.
     * Modified to fetch and display external ratings.
     */
    function create(object) { // Pass the 'object' from component if needed by original logic
        var html;
        var timer; // Timer for TMDB fetch delay
        var network = new Lampa.Reguest(); // Network instance for TMDB fetches
        var loaded = {}; // Cache for *detailed* TMDB API results, keyed by API URL

        // Helper to clear external rating status for a specific item ID
        function clearExternalStatus(tmdb_id) {
             delete externalRatingsCache[tmdb_id];
             delete externalRatingsPending[tmdb_id];
        }

        // Initialize the HTML structure for the info panel
        this.create = function () {
            html = $("<div class=\"new-interface-info\">\n                <div class=\"new-interface-info__body\">\n                    <div class=\"new-interface-info__head\"></div>\n                    <div class=\"new-interface-info__title\"></div>\n                    <div class=\"new-interface-info__details\">\n                        \n                        <div class=\"new-interface-info__ratings\"></div>\n                        \n                        <div class=\"new-interface-info__other-details\"></div>\n                    </div>\n                    <div class=\"new-interface-info__description\"></div>\n                </div>\n            </div>");
        };

        /**
         * Update the info panel when a new item is focused/hovered.
         * @param {object} data - Basic movie/TV data from the list item.
         */
        this.update = function (data) {
            var _this = this; // Capture 'this' for callbacks

            // Immediately update basic info & clear previous details/ratings
            html.find('.new-interface-info__head').text('---'); // Placeholder
            html.find('.new-interface-info__ratings').empty(); // Clear old ratings
            html.find('.new-interface-info__other-details').empty(); // Clear old details
            html.find('.new-interface-info__title').text(data.title || data.name || '');
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));

            // Update background image (using basic data initially)
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            // --- Initiate External Ratings Fetch ---
            // Check if the fetcher is available and we haven't already started/finished fetching for this item ID.
            if (window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function' && data.id && !externalRatingsPending[data.id] && !externalRatingsCache[data.id]) {
                externalRatingsPending[data.id] = true; // Mark as pending

                // Add a visual indicator that ratings are loading
                html.find('.new-interface-info__ratings').html('<span class="new-ratings-loading">' + Lampa.Lang.translate('loading_ratings') + '</span>'); // Using translation key 'loading_ratings'

                // Call the fetcher
                window.ExternalRatingsFetcher.fetch(data, function(externalRatingsResult) {
                    externalRatingsCache[data.id] = externalRatingsResult; // Store the result (success or error)
                    delete externalRatingsPending[data.id]; // Remove pending flag

                    // Check if the detailed TMDB data for this *same item* has already been loaded and drawn.
                    // We identify this by checking if the corresponding TMDB API URL is in the 'loaded' cache.
                    var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

                    if (loaded[tmdb_url]) {
                        // If TMDB data is already displayed, redraw immediately to include the external ratings.
                        _this.draw(loaded[tmdb_url]);
                    }
                    // If TMDB data hasn't loaded yet, the 'draw' call within 'load' will naturally pick up these ratings from the cache later.
                });
            }
            // --- End External Ratings Fetch Initiation ---

            // Proceed to load detailed TMDB data (which might be cached)
            this.load(data);
        };

        /**
         * Draw the detailed information after TMDB data is loaded.
         * @param {object} data - Detailed movie/TV data from TMDB API (potentially enriched).
         */
        this.draw = function (detailedData) {
            var createYear = ((detailedData.release_date || detailedData.first_air_date || '0000') + '').slice(0, 4);
            var tmdbVote = parseFloat((detailedData.vote_average || 0) + '').toFixed(1);
            var head = [];
            var details_ratings = []; // Array for rating elements
            var details_other = []; // Array for other detail elements (genre, runtime, etc.)

            var countries = Lampa.Api.sources.tmdb.parseCountries(detailedData);
            var pg = Lampa.Api.sources.tmdb.parsePG(detailedData);

            // Build Head section (Year, Countries)
            if (createYear !== '0000') head.push('<span>' + createYear + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // --- Build Ratings Section ---
            var ratings_found = false;

            // 1. TMDB Rating
            if (tmdbVote > 0) {
                details_ratings.push('<div class="full-start__rate"><div>' + tmdbVote + '</div><div>TMDB</div></div>');
                ratings_found = true;
            }

            // 2. Check for fetched External Ratings in cache
            var external = externalRatingsCache[detailedData.id];
            if (external) {
                if (external.kp > 0) {
                    details_ratings.push('<div class="full-start__rate"><div>' + parseFloat(external.kp).toFixed(1) + '</div><div>KP</div></div>');
                    ratings_found = true;
                }
                if (external.imdb > 0) {
                    details_ratings.push('<div class="full-start__rate"><div>' + parseFloat(external.imdb).toFixed(1) + '</div><div>IMDB</div></div>');
                    ratings_found = true;
                }
                // Optional: Display error if fetch failed and no ratings found
                // else if (external.error && !external.kp && !external.imdb && !ratings_found) {
                //    details_ratings.push('<span class="new-ratings-error">' + Lampa.Lang.translate('ratings_not_found') + '</span>');
                // }
            } else if (externalRatingsPending[detailedData.id]) {
                // If still pending, show loading indicator
                details_ratings.push('<span class="new-ratings-loading">' + Lampa.Lang.translate('loading_ratings') + '</span>');
            } else if (!external && !ratings_found) {
                 // Optional: If no ratings service was called or finished without results, maybe show nothing or a placeholder
                 // details_ratings.push('<span class="new-ratings-none">-</span>');
            }

            // --- Build Other Details Section ---
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

            // Update the HTML content
            html.find('.new-interface-info__head').empty().append(head.join(', '));
            html.find('.new-interface-info__ratings').html(details_ratings.join(' ')); // Join ratings with spaces
            html.find('.new-interface-info__other-details').html(details_other.join('<span class="new-interface-info__split">&#9679;</span>'));

            // Ensure loading indicator is removed if ratings are now present or fetch completed/failed
             if (external || !externalRatingsPending[detailedData.id]) {
                html.find('.new-ratings-loading').remove();
             }
        };

        /**
         * Load detailed data from TMDB API.
         * @param {object} data - Basic movie/TV data (used for ID and type).
         */
        this.load = function (data) {
            var _this = this;
            clearTimeout(timer); // Clear previous delayed fetch timer
            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));

            // Check TMDB cache first
            if (loaded[url]) {
                // If detailed data is cached, draw it immediately.
                // The 'draw' function will check the externalRatingsCache itself.
                this.draw(loaded[url]);
                return; // Don't fetch if cached
            }

            // If not cached, fetch from TMDB after a short delay
            timer = setTimeout(function () {
                network.clear(); // Clear previous network requests
                network.timeout(5000); // Set timeout for TMDB API call
                network.silent(url, function (movie) { // Success callback
                    loaded[url] = movie; // Cache the successful TMDB result
                    // Now draw the details. The 'draw' function will check
                    // the externalRatingsCache to include KP/IMDB if they arrived.
                    _this.draw(movie);
                }, function(xhr, status) { // Error callback
                    // Optional: Handle TMDB fetch error (e.g., clear fields, show error)
                    // console.error("NewInterface: Failed to load TMDB details:", status);
                     html.find('.new-interface-info__head').text(Lampa.Lang.translate('error')); // Show error in head
                });
            }, 300); // 300ms delay before fetching TMDB data
        };

        // Render the main HTML element of the info panel
        this.render = function () {
            return html;
        };

        // Placeholder function (can be used to clear specific states if needed)
        this.empty = function () {};

        // Cleanup when the component is destroyed
        this.destroy = function () {
            clearTimeout(timer);
            network.clear();
            if (html) {
                html.remove();
            }
            // Clear caches specific to this instance
            // Note: externalRatingsCache/Pending are global to the plugin instance,
            // might need more granular clearing if multiple components run simultaneously,
            // but for InteractionMain replacement, clearing here is likely okay.
            externalRatingsCache = {};
            externalRatingsPending = {};
            loaded = {}; // Clear TMDB cache too
            html = null; // Release reference
        };
    }


    /**
     * Main component managing the list interaction and integrating the info panel.
     */
    function component(object) {
        var network = new Lampa.Reguest(); // Used for background image loading? (Check original usage) - Yes, looks like not used here, info has its own. Safe to keep? Let's keep it for now.
        var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
        var items = []; // Array of Lampa.InteractionLine items
        var html = $('<div class="new-interface"><img class="full-start__background"></div>'); // Main container
        var active = 0; // Index of the currently focused item
        var newlampa = Lampa.Manifest.app_digital >= 166; // Check Lampa version compatibility
        var info; // Instance of the 'create' info panel handler
        var lezydata; // Full dataset for lazy loading items
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; // Check view type settings
        var background_img = html.find('.full-start__background');
        var background_last = '';
        var background_timer;

        this.create = function () {
             // Initial setup before building content, if any.
        };

        // Handle empty results
        this.empty = function () {
            // (Original code for empty state - unchanged)
            var button;
            if (object.source == 'tmdb') {
                button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>');
                button.find('.selector').on('hover:enter', function () {
                    Lampa.Storage.set('source', 'cub');
                    Lampa.Activity.replace({ source: 'cub' });
                });
            }
            var empty = new Lampa.Empty();
            html.append(empty.render(button));
            this.start = empty.start; // Assuming Lampa.Empty provides a start method
            this.activity.loader(false);
            this.activity.toggle();
        };

        // Load next page of results (Original code - unchanged)
        this.loadNext = function () {
            var _this = this;
            if (this.next && !this.next_wait && items.length) {
                this.next_wait = true;
                this.next(function (new_data) {
                    _this.next_wait = false;
                    new_data.forEach(_this.append.bind(_this));
                    Lampa.Layer.visible(items[active + 1].render(true)); // Make next item visible? Check Lampa docs/original intent.
                }, function () {
                    _this.next_wait = false; // Error callback for next page load
                });
            }
        };

        this.push = function () {}; // Original placeholder - unchanged

        // Build the main view with data
        this.build = function (data) {
            var _this2 = this;
            lezydata = data; // Store full data for lazy loading

            // Instantiate the info panel handler
            info = new create(object); // Pass 'object' if 'create' needs it
            info.create(); // Initialize info panel HTML etc.

            // Prepare layout (Original code - unchanged)
            scroll.minus(info.render()); // Position info panel above scroll area
            html.append(info.render()); // Add info panel HTML to the main container
            html.append(scroll.render()); // Add scroll area HTML

            // Append initial items (lazy loading logic)
            data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this));

            // Setup interactions (Original code - unchanged)
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

             // Trigger update for the initially focused item (usually the first one)
             if (items.length > 0 && items[0] && items[0].data) {
                 // Ensure the first item's details and ratings load when the view appears.
                 // Need to ensure the 'active' index is 0 initially.
                 active = 0; // Set active index
                 items[active].toggle(); // Set focus state on the first item visually
                 info.update(items[active].data); // Trigger data load for the first item
                 this.background(items[active].data); // Trigger background update
             }

            this.activity.loader(false); // Hide loading indicator
            this.activity.toggle(); // Make component active
        };

        // Update background image (Original code - unchanged, but check parameter 'elem')
        this.background = function (elem) {
            // Ensure 'elem' has 'backdrop_path'
            if (!elem || !elem.backdrop_path) return;

            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(background_timer);
            if (new_background == background_last) return;

            background_timer = setTimeout(function () {
                background_img.removeClass('loaded');
                background_img[0].onload = function () { background_img.addClass('loaded'); };
                background_img[0].onerror = function () { background_img.removeClass('loaded'); };
                background_last = new_background;
                // Delay setting src slightly for transition? (Original logic)
                setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300);
            }, 1000); // 1-second delay before changing background
        };

        // Append a single item to the list
        this.append = function (element) {
            // Avoid adding duplicates if data is processed multiple times
            if (element.ready || items.some(function(item){ return item.data.id === element.id; })) return;

            var _this3 = this;
            element.ready = true; // Mark element as processed

            var item = new Lampa.InteractionLine(element, { // Create Lampa list item
                url: element.url,
                card_small: true,
                cardClass: element.cardClass,
                genres: object.genres, // Pass genres from parent object
                object: object, // Pass parent object
                card_wide: true,
                nomore: element.nomore
            });
            item.create(); // Initialize item HTML

            // --- Setup Item Interactions ---
            item.onDown = this.down.bind(this);
            item.onUp = this.up.bind(this);
            item.onBack = this.back.bind(this);

            // Update active index when item is toggled/selected
            item.onToggle = function () {
                active = items.indexOf(item);
            };

            // More button handler (Original code - unchanged)
            if (this.onMore) item.onMore = this.onMore.bind(this);

            // *** FOCUS / HOVER HANDLERS - MODIFIED ***
            // When item gets focus (e.g., arrow keys)
            item.onFocus = function (elem) {
                // Call info.update() which now handles both TMDB loading and initiating external fetch.
                info.update(elem);
                _this3.background(elem); // Update background image
            };

            // When item is hovered (e.g., mouse)
            item.onHover = function (elem) {
                // Call info.update() same as onFocus.
                info.update(elem);
                _this3.background(elem); // Update background image
            };
            // *** END FOCUS / HOVER HANDLERS ***

            item.onFocusMore = info.empty.bind(info); // Handler for 'more' button focus (Original code - unchanged)

            scroll.append(item.render()); // Add item HTML to scroll container
            items.push(item); // Add item instance to array
        };

        // Back action (Original code - unchanged)
        this.back = function () { Lampa.Activity.backward(); };

        // Move focus down (Original code - largely unchanged)
        this.down = function () {
            active++;
            active = Math.min(active, items.length - 1);
            // Lazy load next items if needed (Original logic)
            if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this));
            items[active].toggle(); // Set focus on the new active item
            scroll.update(items[active].render()); // Ensure focused item is visible
        };

        // Move focus up (Original code - unchanged)
        this.up = function () {
            active--;
            if (active < 0) {
                active = 0;
                Lampa.Controller.toggle('head'); // Focus header if at the top
            } else {
                items[active].toggle(); // Set focus on the new active item
                scroll.update(items[active].render()); // Ensure focused item is visible
            }
        };

        // Register component with Lampa Controller (Original code - unchanged)
        this.start = function () {
            var _this4 = this;
            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() {
                    if (_this4.activity.canRefresh()) return false; // Prevent action if refreshing
                    if (items.length) { items[active].toggle(); } // Toggle focus on current item
                },
                update: function update() {}, // Placeholder
                left: function left() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function right() { Navigator.move('right'); },
                up: function up() {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function down() {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back
            });
            Lampa.Controller.toggle('content'); // Activate this component's controls
        };

        // Refresh handler (Original code - unchanged)
        this.refresh = function () {
            this.activity.loader(true);
            this.activity.need_refresh = true;
        };

        this.pause = function () {}; // Original placeholder - unchanged
        this.stop = function () {}; // Original placeholder - unchanged

        // Render the main component HTML (Original code - unchanged)
        this.render = function () { return html; };

        // Destroy the component and clean up (Original code - enhanced cleanup)
        this.destroy = function () {
            clearTimeout(background_timer); // Clear background timer
            network.clear(); // Clear component-level network (if used)
            Lampa.Arrays.destroy(items); // Destroy Lampa items
            scroll.destroy(); // Destroy scroll handler
            if (info) info.destroy(); // Destroy info panel instance (clears its caches/timers)
            if (html) html.remove(); // Remove main HTML
            // Nullify references
            items = null;
            network = null;
            lezydata = null;
            info = null;
            html = null;
        };
    }


    // --- Plugin Initialization Logic ---
    function startPlugin() {
        // Make sure Lampa core components are available
        if (!window.Lampa || !Lampa.Reguest || !Lampa.TMDB || !Lampa.Api || !Lampa.Utils || !Lampa.Storage || !Lampa.Scroll || !Lampa.InteractionLine || !Lampa.Template || !Lampa.Lang) {
             console.error("NewInterface Plugin: Missing required Lampa components. Aborting initialization.");
             return;
        }

        // Add language strings if they don't exist
         Lampa.Lang.add({
             loading_ratings: {
                 en: 'Loading ratings...',
                 ru: 'Загрузка рейтингов...'
                 // Add other languages as needed
             },
             ratings_not_found: {
                 en: 'Ratings not found',
                 ru: 'Рейтинги не найдены'
                 // Add other languages as needed
             }
         });


        window.plugin_interface_ready = true; // Set flag indicating plugin is ready
        var old_interface = Lampa.InteractionMain; // Store original InteractionMain
        var new_interface = component; // Our modified component

        // Replace Lampa.InteractionMain
        Lampa.InteractionMain = function (object) {
            var use = new_interface; // Default to new interface

            // Apply original conditions for using the new interface
            if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface;
            if (window.innerWidth < 767) use = old_interface; // Don't use on small screens
            if (!Lampa.Account.hasPremium()) use = old_interface; // Require premium? (Check original)
            if (Lampa.Manifest.app_digital < 153) use = old_interface; // Require specific app version?

            // console.log("NewInterface: Using interface - ", use === new_interface ? "NEW" : "OLD");
            return new use(object); // Instantiate the chosen interface constructor
        };

        // Inject CSS styles only once
        var style_id = 'new_interface_style_with_ratings'; // Unique ID for the style tag
        if (!$('style[data-id="' + style_id + '"]').length) {
            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            /* --- Base Styles from Original --- */
            .new-interface .card--small.card--wide { width: 18.3em; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; /* Adjust height if needed */ }
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1.2em; /* Slightly more height */ }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }

            /* --- Modified Details Layout --- */
            .new-interface-info__details {
                margin-bottom: 1.6em;
                display: flex;
                flex-direction: column; /* Stack ratings above other details */
                align-items: flex-start; /* Align items to the start */
                min-height: 3em; /* Increased min-height for two rows potentially */
                font-size: 1.1em;
            }
            .new-interface-info__ratings {
                display: flex; /* Use flex for ratings */
                flex-wrap: wrap; /* Allow ratings to wrap */
                gap: 1em; /* Space between rating blocks */
                margin-bottom: 0.8em; /* Space below the ratings row */
                min-height: 1.5em; /* Min height for rating row */
            }
            .new-interface-info__other-details {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0 0.5em; /* Add small horizontal gap between items */
                 min-height: 1.5em; /* Min height for details row */
            }

            /* Style for individual rating blocks */
            .full-start__rate {
                font-size: 1.2em; /* Slightly smaller for potentially more ratings */
                display: flex;
                align-items: center;
                gap: 0.4em; /* Space between number and source */
                background-color: rgba(255, 255, 255, 0.05); /* Subtle background */
                padding: 0.2em 0.5em;
                border-radius: 3px;
                white-space: nowrap; /* Prevent wrapping within a rating block */
            }
            .full-start__rate > div:first-child {
                /* Style for rating number */
                font-weight: 600;
            }
            .full-start__rate > div:last-child {
                /* Style for rating source (TMDB, KP, IMDB) */
                font-size: 0.7em;
                opacity: 0.8;
                text-transform: uppercase;
            }

            /* Loading / Error indicators */
            .new-ratings-loading,
            .new-ratings-error {
                font-size: 0.9em;
                opacity: 0.7;
                padding: 0.2em 0; /* Add some padding */
            }

            /* --- Other Original Styles --- */
            .new-interface-info__split { margin: 0 0.5em; font-size: 0.7em; opacity: 0.5; } /* Smaller margin */
            .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
            .new-interface .card-more__box { padding-bottom: 95%; }
            .new-interface .full-start__background { height: 108%; top: -6em; /* Ensure this matches original intent */ }
            .new-interface .card__promo { display: none; }
            .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
            .new-interface .card.card--wide .card-watched { display: none !important; }
            body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
            body.light--version .new-interface-info { height: 25.3em; }
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
            </style>
            `);
            // Use Lampa's method to append the template safely
            $('body').append(Lampa.Template.get(style_id, {}, true));
        }
    }

    // --- Initialization Execution ---
    // Ensure Lampa is ready before starting the plugin
    if (window.Lampa && Lampa.Utils) { // Basic check if Lampa core exists
         if (!window.plugin_interface_ready) {
             startPlugin();
         }
    } else {
        // Fallback: Listen for Lampa's loaded event if script loads too early
        document.addEventListener('lambda:loaded', function() {
             if (!window.plugin_interface_ready) {
                 startPlugin();
             }
        }, { once: true }); // Listen only once
    }

})(); // End of plugin IIFE
