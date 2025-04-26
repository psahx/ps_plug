// == New Interface Script (Modified to use ExternalRatingsFetcher & Handle Nested Data + DEBUG LOGS) ==

(function () {
    'use strict';

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
                    var imdb_placeholder = html.find('#imdb-rating-' + movie_id);
                    var kp_placeholder = html.find('#kp-rating-' + movie_id);
                    if (!imdb_placeholder.length && !kp_placeholder.length) { return; } // Exit if panel destroyed

                    imdb_placeholder.removeClass('loading').empty();
                    kp_placeholder.removeClass('loading').empty();

                    var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '0';
                    var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '0';

                    if (parseFloat(imdb_rating_str) > 0) { imdb_placeholder.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>').show(); } else { imdb_placeholder.hide(); }
                    if (parseFloat(kp_rating_str) > 0) { kp_placeholder.append('<div>' + kp_rating_str + '</div><div>KP</div>').show(); } else { kp_placeholder.hide(); }

                    // --- Dynamic Splitter Logic ---
                    details_container.find('.rating-splitter').remove();
                    var visible_ratings = details_container.find('.full-start__rate:visible');
                    visible_ratings.each(function(index) { if (index < visible_ratings.length - 1) { $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>'); } });
                    if (visible_ratings.length > 0 && other_detail_elements.length > 0) { details_splitter.show(); } else { details_splitter.hide(); }
                });

            } else {
                 console.error("New Interface Draw Error: window.ExternalRatingsFetcher.fetch not found! Initializer failed?");
                 html.find('#imdb-rating-' + movie_id + ', #kp-rating-' + movie_id).hide();
            }
        }; // *** End MODIFIED info.draw ***


        // *** MODIFIED: info.load ***
        this.load = function (data) { // data is the basic object from the list item
            if (!data || !data.id) { console.warn("New Interface - Load: Invalid data received", data); return; }
            var _this = this;
            clearTimeout(timer);
            var media_type = data.name ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));

            if (loaded[url]) {
                 if (loaded[url].external_ids && !loaded[url].imdb_id) { loaded[url].imdb_id = loaded[url].external_ids.imdb_id; }
                 if (!loaded[url].title && loaded[url].name) loaded[url].title = loaded[url].name;
                 if (!loaded[url].original_title && loaded[url].original_name) loaded[url].original_title = loaded[url].original_name;
                 this.draw(loaded[url]);
                 return;
            }
            timer = setTimeout(function () {
                network.clear(); network.timeout(5000);
                network.silent(url, function (movie_detailed) {
                    if (movie_detailed.external_ids) { movie_detailed.imdb_id = movie_detailed.external_ids.imdb_id; }
                    if (!movie_detailed.title && movie_detailed.name) movie_detailed.title = movie_detailed.name;
                    if (!movie_detailed.original_title && movie_detailed.original_name) movie_detailed.original_title = movie_detailed.original_name;
                    loaded[url] = movie_detailed;
                    _this.draw(movie_detailed);
                }, function(a, c) {
                    console.error("New Interface - TMDB Load Error:", network.errorDecode(a,c));
                    html.find('.new-interface-info__details').empty().text('Error loading details.');
                });
            }, 300);
        }; // *** End MODIFIED info.load ***

        this.render = function () { return html; };
        this.empty = function () { if(html) { html.find('.rate--kp, .rate--imdb').empty().hide(); } };
        this.destroy = function () {
            try { if (html) html.remove(); } catch (e) {}
            loaded = {}; html = null;
        };
    } // --- End Info Panel Class ---


    // --- Main Component Class ---
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
        var items = [];
        var html = $('<div class="new-interface"><img class="full-start__background"></div>');
        var active = 0;
        var newlampa = Lampa.Manifest.app_digital >= 166;
        var info;
        var lezydata;
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
        var background_img = html.find('.full-start__background');
        var background_last = '';
        var background_timer;

        this.create = function () {};
        this.empty = function () {
             var button;
             if (object.source == 'tmdb') { /* ... CUB button logic ... */
                button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>');
                button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); });
             }
             var empty = new Lampa.Empty(); html.append(empty.render(button));
             this.start = empty.start; this.activity.loader(false); this.activity.toggle();
        };
        this.loadNext = function () {
            var _this = this;
            if (this.next && !this.next_wait && items.length) {
                this.next_wait = true;
                this.next(function (new_data) {
                    _this.next_wait = false;
                    var results = Array.isArray(new_data) ? new_data : (new_data?.results || []);
                    results.forEach(_this.append.bind(_this));
                    if (items[active + 1]) { Lampa.Layer.visible(items[active + 1].render(true)); }
                }, function () { _this.next_wait = false; });
            }
        };
        this.push = function () {};

        // *** MODIFIED component.build to handle nested data ***
        this.build = function (data) {
            console.log("### New Interface BUILD - START - Received data:", JSON.stringify(data).slice(0, 300) + '...');
            var _this2 = this;
            lezydata = data; // Store original data for potential future use

            try {
                info = new create(); info.create();
                console.log("### New Interface BUILD - Info panel created.");
            } catch (e) {
                console.error("### New Interface BUILD - Error creating info panel:", e);
                this.activity.loader(false); return;
            }

            scroll.minus(info.render());

            var items_to_process = []; // This will hold the list we try to render
            if (Array.isArray(data)) {
                items_to_process = data; // Scenario 1: data is the list
            } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
                items_to_process = data.results; // Scenario 2: data.results is the list
            }
             console.log("### New Interface BUILD - Found", items_to_process.length, "initial items/categories in received data.");

            // --- Try to find the actual movie list ---
            var actual_movie_items = [];
            if (items_to_process.length > 0) {
                var first_item = items_to_process[0];
                // Heuristic 1: Does the first item look like a movie/show card? (has ID and image)
                if (first_item && typeof first_item === 'object' && first_item.id && (first_item.backdrop_path || first_item.poster_path)) {
                    console.log("### New Interface BUILD - Heuristic 1 PASSED: Assuming received items are the movie list.");
                    actual_movie_items = items_to_process;
                }
                // Heuristic 2: If not, does the first item *contain* a 'results' array? (Common pattern for rows)
                else if (first_item && typeof first_item === 'object' && Array.isArray(first_item.results)) {
                     console.log("### New Interface BUILD - Heuristic 2 PASSED: Found nested 'results' in first item. Using that as movie list.");
                     actual_movie_items = first_item.results;
                     // Optional: You could display the title of the row here if needed
                     // e.g., $('<h2 class="new-interface-row-title"></h2>').text(first_item.title).insertBefore(scroll.render());
                }
                // Heuristic 3: Add more checks if needed based on Lampa's data structures
                // ...
                else {
                    // Fallback: If heuristics fail, log a warning and proceed cautiously
                    console.warn("### New Interface BUILD - Heuristics FAILED: Could not determine actual movie list structure. Will attempt to process received items directly (might fail in append).");
                    actual_movie_items = items_to_process;
                }
            } else {
                console.log("### New Interface BUILD - No items found in received data to process.");
            }
             console.log("### New Interface BUILD - Derived actual_movie_items count:", actual_movie_items.length);
             // --- End new logic ---


            // Append initial items (use the list determined by heuristics)
            actual_movie_items.slice(0, viewall ? actual_movie_items.length : 2).forEach(this.append.bind(this));
            console.log("### New Interface BUILD - Finished APPENDING initial items. Total items in 'items' array now:", items.length);


            // Add elements to the main component container
            html.append(info.render()); html.append(scroll.render());

            if (newlampa) { /* ... Lampa layer/scroll handling ... */
                Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true));
                scroll.onEnd = this.loadNext.bind(this);
                scroll.onWheel = function (step) {
                    if (Lampa.Activity.active() !== _this2.activity) return;
                    if (!Lampa.Controller.own(_this2)) _this2.start();
                    if (step > 0) _this2.down(); else if (active > 0) _this2.up();
                };
            }

            // Check if items were actually added before toggling
            if (items.length === 0) {
                 console.warn("### New Interface BUILD - No valid items were appended. Interface might remain empty.");
                 // It might be better *not* to call empty() here, as Lampa might handle empty states
                 // this.empty(); // Avoid calling this unless sure it's needed
            }

            this.activity.loader(false); this.activity.toggle();
            console.log("### New Interface BUILD - END - Activity Toggled.");
        };
        // *** End MODIFIED component.build ***

        this.background = function (elem) {
             if (!elem || !elem.backdrop_path) return;
             var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
             clearTimeout(background_timer);
             if (!new_background || new_background === background_last) return;
             background_timer = setTimeout(function () {
                background_img.removeClass('loaded'); var img = new Image();
                img.onload = function () { if (background_last === new_background) { background_img.attr('src', new_background); background_img.addClass('loaded'); } };
                img.onerror = function () { if (background_last === new_background) { background_img.removeClass('loaded').attr('src', ''); background_last = ''; } };
                background_last = new_background; img.src = new_background;
             }, 300);
        };

        // *** ADDED DEBUG LOGS to component.append ***
        this.append = function (element) { // Appends a single item to the scroll list
             console.log("### New Interface APPEND - START for element ID:", element?.id, "Title:", element?.title || element?.name);
            var _this3 = this;
            if (!element || typeof element !== 'object' || !element.id) { console.log("### New Interface APPEND - Invalid element received (Missing ID or not object)."); return; }; // Added more detail
            if (items.some(function(itm){ return itm.data && itm.data.id === element.id; })) { console.log("### New Interface APPEND - Skipping duplicate element:", element.id); return; };
            if (element.ready) { console.log("### New Interface APPEND - Skipping 'ready' element:", element.id); return; };
            element.ready = true;
            if (!element.title && element.name) element.title = element.name;
            if (!element.original_title && element.original_name) element.original_title = element.original_name;

            var item = new Lampa.InteractionLine(element, { card_small: true, card_wide: true, });
            item.create();
            item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this);
            item.onToggle = function () { active = items.indexOf(item); };
            if (this.onMore) item.onMore = this.onMore.bind(this);
            item.onFocus = function () { if (info && item.data) { info.update(item.data); _this3.background(item.data); } };
            item.onHover = function () { if (info && item.data) { info.update(item.data); _this3.background(item.data); } };
            item.onFocusMore = function() { if(info) info.empty(); };

            scroll.append(item.render()); items.push(item);
            console.log("### New Interface APPEND - END for element ID:", element?.id, ". Total items now:", items.length);
        };
        // *** End MODIFIED component.append ***


        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () {
            if (!items.length || active >= items.length - 1) return; active++;
            active = Math.min(active, items.length - 1);
            var data_source = Array.isArray(lezydata?.results) ? lezydata.results : (Array.isArray(lezydata) ? lezydata : []); // Adjust source check
            if (!viewall && data_source.length > active + 1) {
                 if (!items.some(function(itm){ return itm.data && itm.data.id === data_source[active + 1]?.id; })) { this.append(data_source[active + 1]); }
            }
            if (items[active]) { items[active].toggle(); scroll.update(items[active].render()); }
        };
        this.up = function () {
             if (!items.length || active <= 0) { Lampa.Controller.toggle('head'); return; }
             active--;
             if (items[active]) { items[active].toggle(); scroll.update(items[active].render()); }
             else { Lampa.Controller.toggle('head'); }
        };
        this.start = function () {
            var _this4 = this;
            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() {
                    if (items.length && items[active]) { items[active].toggle(); }
                    else if (items.length) { active = 0; items[0].toggle(); }
                    else { Lampa.Controller.toggle('head'); }
                },
                update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function right() { if (Navigator.canmove('right')) Navigator.move('right'); },
                up: this.up.bind(this), down: this.down.bind(this), back: this.back.bind(this)
            });
            Lampa.Controller.toggle('content');
        };
        this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
        this.pause = function () {}; this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
             try { network.clear(); clearTimeout(background_timer); if (info) info.destroy(); if (items) Lampa.Arrays.destroy(items); if (scroll) scroll.destroy(); if (html) html.remove(); } catch (e) {}
             items = null; scroll = null; network = null; lezydata = null; html = null; background_img = null; info = null; object = null;
        };
    } // --- End Main Component Class ---


    // --- Plugin Initialization (Function that runs the setup) ---
    function startPlugin() {
        if (window.plugin_new_interface_with_ratings_ready) { return; }
        window.plugin_new_interface_with_ratings_ready = true;
        console.log('New Interface Plugin: Starting initialization...');
        var old_interface = Lampa.InteractionMain;
        var new_interface_component = component;
        if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_new_interface_with_ratings_ready = false; return; }

        Lampa.InteractionMain = function (object) { /* ... Override logic ... */
            var use_new_interface = true;
             if (!object || typeof object !== 'object') use_new_interface = false;
             else { if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false; if (window.innerWidth < 767) use_new_interface = false; if (!Lampa.Account.hasPremium()) use_new_interface = false; if (Lampa.Manifest.app_digital < 153) use_new_interface = false; }
            var InterfaceClass = use_new_interface ? new_interface_component : old_interface;
            if (typeof InterfaceClass !== 'function') { InterfaceClass = old_interface; if (typeof InterfaceClass !== 'function') return {}; }
            return new InterfaceClass(object);
        };

        // --- CSS Styles ---
        var style_tag_id = 'new-interface-ratings-style';
        if ($('#' + style_tag_id).length === 0) {
             Lampa.Template.add(style_tag_id, `/* CSS from previous response */ <style id="${style_tag_id}">...</style>`); // Shortened for brevity, use full CSS
             $('body').append(Lampa.Template.get(style_tag_id, {}, true));
        }
        console.log('New Interface Plugin: Initialization complete.');

    } // --- End startPlugin function ---


    // *** Initialization Logic with Polling ***
    function checkAndInitialize() {
        var lampaReady = window.Lampa && Lampa.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain;
        var fetcherReady = window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function';
        if (lampaReady && fetcherReady) { startPlugin(); return true; } return false;
    }
    if (!checkAndInitialize()) {
        var checkInterval = 250; var maxWaitTime = 15000; var timeWaited = 0; var initIntervalTimer = null;
        console.log('New Interface Plugin: Prerequisites not met. Starting polling...');
        initIntervalTimer = setInterval(function() {
            timeWaited += checkInterval;
            if (checkAndInitialize()) { clearInterval(initIntervalTimer); }
            else if (timeWaited >= maxWaitTime) { clearInterval(initIntervalTimer); console.error('New Interface Plugin Error: Timed out waiting for Lampa and/or ExternalRatingsFetcher plugin.'); }
        }, checkInterval);
    }
    // *** End Initialization Logic ***

})(); // --- End IIFE ---
