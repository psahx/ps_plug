// == New Interface Script (Modified to use ExternalRatingsFetcher & WAIT for it) ==

(function () {
    'use strict';

    // No helper functions needed here, they are in Rating_Fetcher.js

    // --- Info Panel Class ---
    function create() { // Defines the controller for the info panel
        var html;       // Reference to the panel's jQuery HTML object
        var timer;      // Timer for delaying TMDB load
        var network = new Lampa.Reguest(); // Network instance for TMDB load
        var loaded = {};    // Cache for detailed TMDB data

        this.create = function () {
            // Original HTML structure - no changes needed here
            html = $("<div class=\"new-interface-info\">\n                <div class=\"new-interface-info__body\">\n                    <div class=\"new-interface-info__head\"></div>\n                    <div class=\"new-interface-info__title\"></div>\n                    <div class=\"new-interface-info__details\"></div>\n                    <div class=\"new-interface-info__description\"></div>\n                </div>\n            </div>");
        };

        this.update = function (data) {
            // Basic validation
            if (!data || typeof data !== 'object') {
                console.warn("New Interface - Update: Invalid data received", data);
                return;
            }
            // Clear panel and show loading state
            html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---');
            html.find('.new-interface-info__title').text(data.title || data.name || ''); // Use title/name
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
            // Don't change background here, let component's background logic handle it
            this.load(data); // Trigger detailed load
        };

        // *** MODIFIED: info.draw ***
        this.draw = function (data) { // 'data' is the detailed TMDB movie object
            // Basic validation
            if (!data || typeof data !== 'object' || !data.id) {
                 console.warn("New Interface - Draw: Invalid detailed data received", data);
                 html.find('.new-interface-info__details').empty().text('Error loading details.');
                 return;
            }

            var _this_info = this; // Reference to 'this' (the info instance) for callbacks if needed
            var movie_id = data.id; // Unique ID for targeting elements

            // --- Original logic for head ---
            var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var head = [];
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            if (create_year !== '0000') head.push('<span>' + create_year + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));
            html.find('.new-interface-info__head').empty().append(head.join(', '));
            // --- End Head Logic ---

            // --- Details Section Logic ---
            var details_container = html.find('.new-interface-info__details').empty(); // Clear previous details

            var rating_elements = []; // Store rating HTML strings/elements
            var other_detail_elements = []; // Store other details HTML strings/elements

            // 1. TMDB Rating (from original logic)
            var vote_tmdb = parseFloat((data.vote_average || 0) + '').toFixed(1);
            if (vote_tmdb > 0) {
                // Added rate--tmdb class for potential specific styling
                rating_elements.push('<div class="full-start__rate rate--tmdb"><div>' + vote_tmdb + '</div><div>TMDB</div></div>');
            }

            // 2. Placeholders for KP and IMDB ratings (using unique IDs)
            rating_elements.push('<div class="full-start__rate rate--imdb loading" id="imdb-rating-' + movie_id + '">...</div>');
            rating_elements.push('<div class="full-start__rate rate--kp loading" id="kp-rating-' + movie_id + '">...</div>');

            // 3. Other Details (Genres, Runtime, PG - from original logic)
            var pg = Lampa.Api.sources.tmdb.parsePG(data);
            if (data.genres && data.genres.length > 0) {
                other_detail_elements.push(data.genres.map(function (item) {
                    return Lampa.Utils.capitalizeFirstLetter(item.name);
                }).join(' | '));
            }
            if (data.runtime) {
                other_detail_elements.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            }
            if (pg) {
                other_detail_elements.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');
            }

            // 4. Construct and Append Details HTML (splitters handled in callback)
            // Append ratings first, then other details
            details_container.append(rating_elements.join(''));
            // Add a hidden splitter between ratings and other details
            var details_splitter = $('<span class="new-interface-info__split details-splitter" style="display: none;">&#9679;</span>');
            details_container.append(details_splitter);
            details_container.append(other_detail_elements.join('<span class="new-interface-info__split">&#9679;</span>'));

            // 5. Call External Ratings Fetcher Plugin (Check moved to initializer)
            // Assume ExternalRatingsFetcher exists because the initializer waited for it
            if (window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function') {
                // Prepare data object for the fetcher
                var data_for_fetcher = {
                    id: data.id,
                    title: data.title || data.name,
                    original_title: data.original_title || data.original_name,
                    release_date: data.release_date || data.first_air_date,
                    imdb_id: data.imdb_id // Provided by modified 'load' function
                };

                // Call fetcher, provide callback to update UI
                window.ExternalRatingsFetcher.fetch(data_for_fetcher, function(ratings) {
                    // Callback runs when fetcher completes (success, cached, or error)
                    // 'ratings' object should be {kp: ..., imdb: ..., error: ...}

                    // Find placeholders within *this specific info panel* using unique IDs
                    var imdb_placeholder = html.find('#imdb-rating-' + movie_id);
                    var kp_placeholder = html.find('#kp-rating-' + movie_id);

                    // Check if placeholders still exist (user might have navigated away quickly)
                    if (!imdb_placeholder.length && !kp_placeholder.length) {
                        return; // Exit if panel was destroyed or redrawn
                    }

                    imdb_placeholder.removeClass('loading').empty();
                    kp_placeholder.removeClass('loading').empty();

                    var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '0';
                    var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '0';

                    // Update placeholders with ratings or hide them
                    if (parseFloat(imdb_rating_str) > 0) {
                        imdb_placeholder.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>').show();
                    } else {
                        imdb_placeholder.hide();
                    }

                    if (parseFloat(kp_rating_str) > 0) {
                        kp_placeholder.append('<div>' + kp_rating_str + '</div><div>KP</div>').show();
                    } else {
                        kp_placeholder.hide();
                    }

                    // --- Dynamic Splitter Logic ---
                    details_container.find('.rating-splitter').remove(); // Clear previous rating splitters
                    var visible_ratings = details_container.find('.full-start__rate:visible');
                    visible_ratings.each(function(index) {
                        if (index < visible_ratings.length - 1) {
                            // Add splitter after each visible rating except the last
                            $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>');
                        }
                    });

                    // Show/hide splitter between ratings group and other details group
                    if (visible_ratings.length > 0 && other_detail_elements.length > 0) {
                        details_splitter.show();
                    } else {
                        details_splitter.hide();
                    }
                    // --- End Splitter Logic ---
                }); // End of fetcher callback

            } else {
                 // This error should technically not happen if the initializer worked correctly
                 console.error("New Interface Draw Error: window.ExternalRatingsFetcher.fetch not found! Initializer failed?");
                 // Hide placeholders as a fallback
                 html.find('#imdb-rating-' + movie_id + ', #kp-rating-' + movie_id).hide();
            }
            // --- End Details Section ---
        }; // *** End MODIFIED info.draw ***


        // *** MODIFIED: info.load ***
        this.load = function (data) { // data is the basic object from the list item
            // Basic validation
            if (!data || !data.id) {
                 console.warn("New Interface - Load: Invalid data received", data);
                 return;
            }

            var _this = this;
            clearTimeout(timer);

            // *** MODIFIED URL: Added 'external_ids' to append_to_response ***
            var media_type = data.name ? 'tv' : 'movie'; // Determine media type
            var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));

            // Check TMDB cache ('loaded' object)
            if (loaded[url]) {
                 // Ensure imdb_id is available from cached data
                 if (loaded[url].external_ids && !loaded[url].imdb_id) {
                     loaded[url].imdb_id = loaded[url].external_ids.imdb_id;
                 }
                 // Ensure title consistency
                 if (!loaded[url].title && loaded[url].name) loaded[url].title = loaded[url].name;
                 if (!loaded[url].original_title && loaded[url].original_name) loaded[url].original_title = loaded[url].original_name;

                 this.draw(loaded[url]); // Draw using cached detailed data
                 return;
            }

            // Fetch detailed TMDB data if not cached
            timer = setTimeout(function () {
                network.clear();
                network.timeout(5000); // TMDB timeout
                network.silent(url, function (movie_detailed) { // movie_detailed is the response
                    // *** Process external_ids to add imdb_id ***
                    if (movie_detailed.external_ids) {
                        movie_detailed.imdb_id = movie_detailed.external_ids.imdb_id;
                    }
                     // Ensure title consistency needed by fetcher/draw
                     if (!movie_detailed.title && movie_detailed.name) movie_detailed.title = movie_detailed.name;
                     if (!movie_detailed.original_title && movie_detailed.original_name) movie_detailed.original_title = movie_detailed.original_name;

                    loaded[url] = movie_detailed; // Cache the result
                    _this.draw(movie_detailed); // Draw with the fetched detailed data

                }, function(a, c) { // Error fetching TMDB details
                    console.error("New Interface - TMDB Load Error:", network.errorDecode(a,c));
                     html.find('.new-interface-info__details').empty().text('Error loading details.');
                });
            }, 300); // Delay before fetch
        }; // *** End MODIFIED info.load ***

        this.render = function () {
            return html;
        };

        this.empty = function () {
             // Clear placeholders when emptying (e.g., focusing "More")
             if(html) {
                 html.find('.rate--kp, .rate--imdb').empty().hide();
             }
        };

        this.destroy = function () {
            // Use try-catch for safety during potential rapid destruction/recreation
            try {
                if (html) html.remove();
            } catch (e) { console.error("Error removing info HTML:", e); }
            loaded = {};
            html = null;
        };
    } // --- End Info Panel Class ---


    // --- Main Component Class (No changes needed from previous version) ---
    function component(object) {
        var network = new Lampa.Reguest(); // Network for component (e.g., next page load)
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            scroll_by_item: true
        });
        var items = []; // Array of Lampa.InteractionLine instances
        var html = $('<div class="new-interface"><img class="full-start__background"></div>');
        var active = 0;
        var newlampa = Lampa.Manifest.app_digital >= 166;
        var info; // Instance of the 'create' class (info panel controller)
        var lezydata; // Reference to the full dataset for lazy loading
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
        var background_img = html.find('.full-start__background');
        var background_last = '';
        var background_timer;

        this.create = function () {};

        this.empty = function () { // Render empty state
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
             this.start = empty.start; // Use empty component's start method
             this.activity.loader(false);
             this.activity.toggle();
        };

        this.loadNext = function () { // Load next page of items
            var _this = this;
            if (this.next && !this.next_wait && items.length) {
                this.next_wait = true;
                this.next(function (new_data) { // 'next' is likely passed in by Lampa framework
                    _this.next_wait = false;
                    var results_to_append = [];
                    if (Array.isArray(new_data)) {
                        results_to_append = new_data;
                    } else if (new_data && typeof new_data === 'object' && Array.isArray(new_data.results)) {
                        results_to_append = new_data.results;
                    }
                    results_to_append.forEach(_this.append.bind(_this));

                    if (items[active + 1]) { // Check if next item exists before making visible
                        Lampa.Layer.visible(items[active + 1].render(true));
                    }
                }, function () { // Error callback for next page load
                    _this.next_wait = false;
                });
            }
        };

        this.push = function () {}; // Placeholder

        this.build = function (data) { // data is the initial list/results object
            var _this2 = this;
            lezydata = data; // Store for lazy loading

            info = new create(); // Instantiate the modified info panel controller
            info.create(); // Build its HTML

            scroll.minus(info.render()); // Exclude info panel from scroll calculations

            // Determine initial items to render
            var initial_items = [];
            if (Array.isArray(data)) {
                initial_items = data;
            } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
                initial_items = data.results;
            }

            // Append initial items to the scroll container
             initial_items.slice(0, viewall ? initial_items.length : 2).forEach(this.append.bind(this));


            // Add elements to the main component container
            html.append(info.render()); // Add info panel
            html.append(scroll.render()); // Add scroll area

            // Lampa specific layer/scroll handling
            if (newlampa) {
                Lampa.Layer.update(html);
                Lampa.Layer.visible(scroll.render(true));
                scroll.onEnd = this.loadNext.bind(this); // Setup infinite scroll
                scroll.onWheel = function (step) {
                    if (Lampa.Activity.active() !== _this2.activity) return; // Only handle if active
                    if (!Lampa.Controller.own(_this2)) _this2.start();
                    if (step > 0) _this2.down();
                    else if (active > 0) _this2.up();
                };
            }

            this.activity.loader(false); // Hide loading indicator
            this.activity.toggle(); // Make the activity visible/active
        };

        this.background = function (elem) { // Handles background image changes
             if (!elem || !elem.backdrop_path) return; // Need element with backdrop
             var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
             clearTimeout(background_timer);
             if (!new_background || new_background === background_last) return;

             background_timer = setTimeout(function () {
                background_img.removeClass('loaded');
                var img = new Image();
                img.onload = function () {
                    if (background_last === new_background) { // Check if still relevant
                        background_img.attr('src', new_background);
                        background_img.addClass('loaded');
                    }
                };
                img.onerror = function () {
                    if (background_last === new_background) {
                        background_img.removeClass('loaded').attr('src', '');
                        background_last = ''; // Reset last path on error
                    }
                };
                background_last = new_background; // Set last requested path *before* loading
                img.src = new_background; // Start loading
             }, 300);
        };

        this.append = function (element) { // Appends a single item to the scroll list
            var _this3 = this;
            // Validate element and check for duplicates
            if (!element || typeof element !== 'object' || !element.id) return;
            if (items.some(function(itm){ return itm.data && itm.data.id === element.id; })) return; // Skip duplicates

            if (element.ready) return; // Use ready flag if present
            element.ready = true;

            // Ensure title/name consistency needed by info.update
            if (!element.title && element.name) element.title = element.name;
            if (!element.original_title && element.original_name) element.original_title = element.original_name;

            // Create Lampa list item
            var item = new Lampa.InteractionLine(element, {
                card_small: true,
                card_wide: true,
            });
            item.create();
            // Assuming Lampa.InteractionLine stores the original 'element' in 'item.data'

            // Setup interaction handlers
            item.onDown = this.down.bind(this);
            item.onUp = this.up.bind(this);
            item.onBack = this.back.bind(this);
            item.onToggle = function () { active = items.indexOf(item); };

            if (this.onMore) item.onMore = this.onMore.bind(this); // Pass through 'More' handler if exists

            item.onFocus = function () {
                 if (info && item.data) { // Check info panel and item data exist
                     info.update(item.data); // Update info panel with this item's data
                     _this3.background(item.data); // Update background
                 }
            };
            item.onHover = function () { // Same as onFocus for hover interaction
                 if (info && item.data) {
                     info.update(item.data);
                     _this3.background(item.data);
                 }
            };
            item.onFocusMore = function() { if(info) info.empty(); }; // Clear panel on "More" focus

            // Add item to scroll container and internal list
            scroll.append(item.render());
            items.push(item);
        };

        this.back = function () { Lampa.Activity.backward(); }; // Standard back action

        this.down = function () { // Navigate down
            if (!items.length || active >= items.length - 1) return; // Boundary check
            active++;
            active = Math.min(active, items.length - 1); // Ensure valid index

            // Lazy load check
            var data_source = Array.isArray(lezydata) ? lezydata : (lezydata && Array.isArray(lezydata.results) ? lezydata.results : []);
            if (!viewall && data_source.length > active + 1) { // Check if more data exists beyond current view + buffer
                 // Append next item if not already rendered
                 if (!items.some(function(itm){ return itm.data && itm.data.id === data_source[active + 1]?.id; })) {
                    this.append(data_source[active + 1]);
                 }
            }

            if (items[active]) { // Check item exists
                 items[active].toggle(); // Focus item
                 scroll.update(items[active].render()); // Update scroll position
            }
        };

        this.up = function () { // Navigate up
             if (!items.length || active <= 0) { // Boundary check
                 Lampa.Controller.toggle('head'); // Toggle header if at top
                 return;
             }
             active--;
             if (items[active]) { // Check item exists
                 items[active].toggle(); // Focus item
                 scroll.update(items[active].render()); // Update scroll position
             } else {
                 Lampa.Controller.toggle('head'); // Fallback if item somehow doesn't exist
             }
        };

        this.start = function () { // Register component with Lampa controller
            var _this4 = this;
            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() { // Called when focus returns to this component
                    if (items.length && items[active]) {
                        items[active].toggle(); // Focus the currently active item
                    } else if (items.length) {
                        active = 0; // Reset to first item if active index invalid
                        items[0].toggle();
                    } else {
                        Lampa.Controller.toggle('head'); // Or toggle head if no items
                    }
                },
                update: function update() {}, // Placeholder
                left: function left() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function right() {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: this.up.bind(this), // Use component's up handler
                down: this.down.bind(this), // Use component's down handler
                back: this.back.bind(this) // Use component's back handler
            });
            Lampa.Controller.toggle('content'); // Activate this component's controller bindings
        };

        this.refresh = function () { // Placeholder for refresh logic
            this.activity.loader(true);
            this.activity.need_refresh = true;
        };

        this.pause = function () {}; // Activity lifecycle placeholder
        this.stop = function () {}; // Activity lifecycle placeholder

        this.render = function () { return html; }; // Return the main jQuery element

        this.destroy = function () { // Cleanup
             // Use try-catch for safety during potential rapid destruction/recreation
             try {
                 network.clear();
                 clearTimeout(background_timer);
                 if (info) info.destroy();
                 if (items) Lampa.Arrays.destroy(items);
                 if (scroll) scroll.destroy();
                 if (html) html.remove();
             } catch (e) { console.error("Error during component destruction:", e); }
             items = null; scroll = null; network = null; lezydata = null; html = null; background_img = null; info = null; object = null;
        };
    } // --- End Main Component Class ---


    // --- Plugin Initialization (Function that runs the setup) ---
    function startPlugin() {
        // Ensure this plugin only initializes once
        if (window.plugin_new_interface_with_ratings_ready) {
            return;
        }
        // Set flag early to prevent race conditions with the timer
        window.plugin_new_interface_with_ratings_ready = true;

        console.log('New Interface Plugin: Starting initialization...');

        var old_interface = Lampa.InteractionMain;
        var new_interface_component = component; // Reference the component class

        if (typeof Lampa.InteractionMain !== 'function') {
             console.error("New Interface Plugin Error: Lampa.InteractionMain not found.");
             // Reset flag if failed critically
             window.plugin_new_interface_with_ratings_ready = false;
             return; // Cannot proceed
        }

        // Override Lampa.InteractionMain
        Lampa.InteractionMain = function (object) {
            var use_new_interface = true;
             if (!object || typeof object !== 'object') use_new_interface = false;
             else { // Conditions from original script
                 if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false;
                 if (window.innerWidth < 767) use_new_interface = false;
                 if (!Lampa.Account.hasPremium()) use_new_interface = false;
                 if (Lampa.Manifest.app_digital < 153) use_new_interface = false;
             }

            var InterfaceClass = use_new_interface ? new_interface_component : old_interface;
            if (typeof InterfaceClass !== 'function') {
                 console.error("New Interface Plugin Error: Resolved InterfaceClass is not a function. Falling back.", InterfaceClass);
                 InterfaceClass = old_interface;
                 if (typeof InterfaceClass !== 'function') return {}; // Critical error
            }
             // console.log('New Interface Plugin: Instantiating InterfaceClass');
            return new InterfaceClass(object); // Instantiate chosen class
        };

        // --- CSS Styles ---
        var style_tag_id = 'new-interface-ratings-style'; // Unique ID for style tag
        if ($('#' + style_tag_id).length === 0) { // Check if style already exists
             Lampa.Template.add(style_tag_id, `
             <style id="${style_tag_id}">
             /* Styles from previous response */
             .new-interface .card--small.card--wide { width: 18.3em; }
             .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
             .new-interface-info__body { width: 80%; padding-top: 1.1em; }
             .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
             .new-interface-info__head span { color: #fff; }
             .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
             .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; }
             .new-interface-info__split { margin: 0 0.8em; font-size: 0.7em; display: inline-block; vertical-align: middle; }
             .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
             .new-interface .card-more__box { padding-bottom: 95%; }
             .new-interface .full-start__background { position: absolute; left:0; right:0; width: 100%; height: 108%; top: -6em; object-fit: cover; object-position: center center; opacity: 0; transition: opacity 0.5s ease; z-index: -1; }
             .new-interface .full-start__background.loaded { opacity: 1; }
             .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0; display: inline-flex; flex-direction: column; align-items: center; text-align: center; min-width: 3.5em; vertical-align: middle; }
             .new-interface .full-start__rate > div:first-child { font-weight: bold; font-size: 1.1em; }
             .new-interface .full-start__rate > div:last-child { font-size: 0.8em; color: rgba(255,255,255,0.7); text-transform: uppercase; }
             .new-interface .full-start__rate.loading { min-width: 2.5em; color: rgba(255,255,255,0.5); justify-content: center; display: inline-flex; }
             .new-interface .full-start__rate.loading > div { display: none; }
             .new-interface .full-start__rate.loading::after { content: '.'; animation: dots 1s steps(5, end) infinite; display: inline-block; width: 1em; text-align: left; font-size: 1.1em; font-weight: bold; }
             .new-interface .card__promo { display: none; }
             .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
             .new-interface .card.card--wide .card-watched { display: none !important; }
             body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
             body.light--version .new-interface-info { height: 25.3em; }
             body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
             body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
             @keyframes dots { 0%, 20% { color: rgba(0,0,0,0); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); } 40% { color: rgba(255,255,255,0.5); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); } 60% { text-shadow: .25em 0 0 rgba(255,255,255,0.5), .5em 0 0 rgba(0,0,0,0); } 80%, 100% { text-shadow: .25em 0 0 rgba(255,255,255,0.5), .5em 0 0 rgba(255,255,255,0.5); } }
             </style>
             `);
             $('body').append(Lampa.Template.get(style_tag_id, {}, true));
        }
        console.log('New Interface Plugin: Initialization complete.');

    } // --- End startPlugin function ---


    // *** MODIFIED Initialization Logic ***
    // Function to check prerequisites and initialize
    function checkAndInitialize() {
        // Prerequisite 1: Lampa core objects must be ready
        var lampaReady = window.Lampa && Lampa.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain;
        // Prerequisite 2: The ExternalRatingsFetcher plugin must be loaded and ready
        var fetcherReady = window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function';

        if (lampaReady && fetcherReady) {
            console.log('New Interface Plugin: Lampa and Fetcher are ready. Initializing...');
            startPlugin(); // Call the main initialization function
            return true; // Indicate success
        }
        // console.log('New Interface Plugin: Waiting for prerequisites...', {lampaReady, fetcherReady});
        return false; // Indicate prerequisites not met
    }

    // Polling mechanism
    if (!checkAndInitialize()) { // If not ready immediately, start polling
        var checkInterval = 250; // ms
        var maxWaitTime = 15000; // 15 seconds
        var timeWaited = 0;

        console.log('New Interface Plugin: Prerequisites not met. Starting polling...');

        var initIntervalTimer = setInterval(function() {
            timeWaited += checkInterval;
            if (checkAndInitialize()) { // If ready now
                clearInterval(initIntervalTimer); // Stop polling
            } else if (timeWaited >= maxWaitTime) { // If timed out
                clearInterval(initIntervalTimer); // Stop polling
                console.error('New Interface Plugin Error: Timed out waiting for Lampa and/or ExternalRatingsFetcher plugin.');
                // Optional: Maybe try to initialize anyway without fetcher? Or just fail.
                // Attempt init anyway, draw function has fallback check
                 // console.log('New Interface Plugin: Attempting initialization despite timeout...');
                 // startPlugin(); // Might fail later if fetcher truly missing
            }
        }, checkInterval);
    }
    // *** End MODIFIED Initialization Logic ***

})(); // --- End IIFE ---
