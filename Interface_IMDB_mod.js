// == New Interface Script (Corrected Component Structure based on Lampa Source) ==

(function () {
    'use strict';

    // --- Info Panel Class (Info/Create/Draw/Load - Kept from previous working version) ---
    // This part handles displaying details once it receives valid movie data
    function create() {
        var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
        this.create = function () { html = $("<div class=\"new-interface-info\"><div class=\"new-interface-info__body\"><div class=\"new-interface-info__head\"></div><div class=\"new-interface-info__title\"></div><div class=\"new-interface-info__details\"></div><div class=\"new-interface-info__description\"></div></div></div>"); };
        this.update = function (data) { if (!data || typeof data !== 'object') { return; } html.find('.new-interface-info__head,.new-interface-info__details').empty().text('---'); html.find('.new-interface-info__title').text(data.title || data.name || ''); html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext')); this.load(data); };
        this.draw = function (data) {
            if (!data || typeof data !== 'object' || !data.id) { html.find('.new-interface-info__details').empty().text('Error loading details.'); return; }
            var movie_id = data.id; var create_year = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var head = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            if (create_year !== '0000') head.push('<span>' + create_year + '</span>'); if (countries.length > 0) head.push(countries.join(', ')); html.find('.new-interface-info__head').empty().append(head.join(', '));
            var details_container = html.find('.new-interface-info__details').empty(); var rating_elements = []; var other_detail_elements = [];
            var vote_tmdb = parseFloat((data.vote_average || 0) + '').toFixed(1); if (vote_tmdb > 0) { rating_elements.push('<div class="full-start__rate rate--tmdb"><div>' + vote_tmdb + '</div><div>TMDB</div></div>'); }
            rating_elements.push('<div class="full-start__rate rate--imdb loading" id="imdb-rating-' + movie_id + '">...</div>'); rating_elements.push('<div class="full-start__rate rate--kp loading" id="kp-rating-' + movie_id + '">...</div>');
            var pg = Lampa.Api.sources.tmdb.parsePG(data); if (data.genres && data.genres.length > 0) { other_detail_elements.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); } if (data.runtime) { other_detail_elements.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); } if (pg) { other_detail_elements.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); }
            details_container.append(rating_elements.join('')); var details_splitter = $('<span class="new-interface-info__split details-splitter" style="display: none;">&#9679;</span>'); details_container.append(details_splitter); details_container.append(other_detail_elements.join('<span class="new-interface-info__split">&#9679;</span>'));
            // Call Fetcher
            if (window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function') {
                var data_for_fetcher = { id: data.id, title: data.title || data.name, original_title: data.original_title || data.original_name, release_date: data.release_date || data.first_air_date, imdb_id: data.imdb_id };
                window.ExternalRatingsFetcher.fetch(data_for_fetcher, function(ratings) { // Callback to update UI
                    var imdb_placeholder = html.find('#imdb-rating-' + movie_id); var kp_placeholder = html.find('#kp-rating-' + movie_id); if (!imdb_placeholder.length && !kp_placeholder.length) { return; }
                    imdb_placeholder.removeClass('loading').empty(); kp_placeholder.removeClass('loading').empty();
                    var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '0'; var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '0';
                    if (parseFloat(imdb_rating_str) > 0) { imdb_placeholder.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>').show(); } else { imdb_placeholder.hide(); } if (parseFloat(kp_rating_str) > 0) { kp_placeholder.append('<div>' + kp_rating_str + '</div><div>KP</div>').show(); } else { kp_placeholder.hide(); }
                    details_container.find('.rating-splitter').remove(); var visible_ratings = details_container.find('.full-start__rate:visible'); visible_ratings.each(function(index) { if (index < visible_ratings.length - 1) { $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>'); } }); if (visible_ratings.length > 0 && other_detail_elements.length > 0) { details_splitter.show(); } else { details_splitter.hide(); }
                });
            } else { console.error("New Interface Draw Error: window.ExternalRatingsFetcher.fetch not found!"); html.find('#imdb-rating-' + movie_id + ', #kp-rating-' + movie_id).hide(); }
        };
        this.load = function (data) { // Load detailed data for info panel
            if (!data || !data.id) { return; } var _this = this; clearTimeout(timer); var media_type = data.name ? 'tv' : 'movie'; var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language'));
            if (loaded[url]) { if (loaded[url].external_ids && !loaded[url].imdb_id) { loaded[url].imdb_id = loaded[url].external_ids.imdb_id; } if (!loaded[url].title && loaded[url].name) loaded[url].title = loaded[url].name; if (!loaded[url].original_title && loaded[url].original_name) loaded[url].original_title = loaded[url].original_name; this.draw(loaded[url]); return; }
            timer = setTimeout(function () {
                network.clear(); network.timeout(5000); network.silent(url, function (movie_detailed) { if (movie_detailed.external_ids) { movie_detailed.imdb_id = movie_detailed.external_ids.imdb_id; } if (!movie_detailed.title && movie_detailed.name) movie_detailed.title = movie_detailed.name; if (!movie_detailed.original_title && movie_detailed.original_name) movie_detailed.original_title = movie_detailed.original_name; loaded[url] = movie_detailed; _this.draw(movie_detailed); }, function(a, c) { console.error("New Interface - TMDB Load Error:", network.errorDecode(a,c)); html.find('.new-interface-info__details').empty().text('Error loading details.'); });
            }, 300);
        };
        this.render = function () { return html; }; this.empty = function () { if(html) { html.find('.rate--kp, .rate--imdb').empty().hide(); html.find('.new-interface-info__head,.new-interface-info__details,.new-interface-info__title,.new-interface-info__description').empty(); } }; // Clear panel more thoroughly
        this.destroy = function () { try { if (html) html.remove(); } catch (e) {} loaded = {}; html = null; network.clear(); }; // Clear network requests
    } // --- End Info Panel Class ---


    // --- Main Component Class (Restructured based on Lampa Source) ---
    function component(object) { // 'object' parameter holds component config/context (e.g., {component: 'main', source: 'tmdb'})
        var network = new Lampa.Reguest(); // Network for loading next page data etc.
        var scroll = new Lampa.Scroll({mask:true,over: true,scroll_by_item:true}); // Vertical scroll for lines
        var items = []; // Holds the instances of Lampa.InteractionLine (each representing a row)
        var html = $('<div class="new-interface new-interface--rows"><img class="full-start__background"></div>'); // Added specific class
        var active = 0; // Index of the currently focused line/row
        var newlampa = Lampa.Manifest.app_digital >= 166;
        var info; // Instance of the info panel controller ('create' function above)
        var lezydata; // To store original data if needed for 'next' page loading
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; // Not really used in row layout
        var background_img = html.find('.full-start__background');
        var background_last = '';
        var background_timer;

        // Access Lampa.InteractionLine (assuming it's globally available or registered)
        // If it's not global, this needs adjustment based on how Lampa handles imports/modules.
        var Line = Lampa.InteractionLine; // Use the correct Lampa component for rows

        // Check if Line component is available
        if (typeof Line !== 'function') {
            console.error("New Interface Error: Lampa.InteractionLine (js/interaction/items/line.js) component not found or not a function!");
            // Provide a fallback or throw error
            this.build = function(data){ this.empty(); console.error("Cannot build interface: Lampa.InteractionLine missing."); }
            // ... other methods might need fallbacks too ...
            // return; // Stop further execution of constructor if critical component missing
        }


        this.create = function () {
            // Create the info panel instance
            info = new create();
            info.create();
            html.append(info.render()); // Add info panel to the top
            html.append(scroll.render()); // Add vertical scroll container
        };

        this.empty = function () { /* ... empty state logic ... */
             console.log("### New Interface EMPTY called");
             var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); }
             var empty = new Lampa.Empty(); if(button) empty.append(button); empty.addInfoButton();
             // Clear previous content and add empty message
             scroll.render().empty(); html.find('.new-interface-info').hide(); // Hide info panel
             scroll.append(empty.render(true));
             this.start = empty.start; this.activity.loader(false); this.activity.toggle();
        };

        this.loadNext = function () { /* ... load next page logic (might need rework depending on how main screen pagination works) ... */
             // This likely needs modification if 'this.next' expects categories, not movies
             console.log("### New Interface LOAD_NEXT called (Not fully implemented for category structure)");
            var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; var rows = Array.isArray(new_data) ? new_data : (new_data?.results || []); rows.forEach(_this.buildLine.bind(_this)); /* Need to build lines, not append items */ if (items[active + 1]) { /* Visibility might relate to lines now */ } }, function () { _this.next_wait = false; }); }
        };

        // *** REPLACED build with logic to create Lines ***
        this.build = function (data) {
            console.log("### New Interface BUILD - START - Received data:", JSON.stringify(data).slice(0, 300) + '...');
            var _this2 = this;
            lezydata = data; // Store original data

            // Clear previous items in scroll container
            scroll.clear();
            items = []; // Reset internal list of lines
            active = 0; // Reset active line index

            var rows_to_process = [];
            if (Array.isArray(data)) { // Is data the array of rows?
                rows_to_process = data;
            } else if (data?.results) { // Is data.results the array of rows?
                rows_to_process = data.results;
            }
             console.log("### New Interface BUILD - Found", rows_to_process.length, "rows/categories to process.");

            if (rows_to_process.length === 0) {
                 console.log("### New Interface BUILD - No rows found in data.");
                 this.empty(); // Show empty state if no rows
                 return;
            }

            // Iterate through rows and build a Line for each
            rows_to_process.forEach(this.buildLine.bind(this));

            console.log("### New Interface BUILD - Finished building lines. Total lines:", items.length);

            // Show info panel again if it was hidden by empty()
             html.find('.new-interface-info').show();

            // Lampa specific layer/scroll handling
            if (newlampa) {
                Lampa.Layer.update(html);
                Lampa.Layer.visible(scroll.render(true));
                scroll.onEnd = this.loadNext.bind(this); // Setup infinite scroll for lines/pages
                scroll.onWheel = function (step) { // Vertical scroll
                    if (Lampa.Activity.active() !== _this2.activity) return;
                    if (!Lampa.Controller.own(_this2)) _this2.start();
                    // Let default scroll handle wheel for vertical movement
                    // if (step > 0) _this2.down(); else if (active > 0) _this2.up();
                };
            }

            this.activity.loader(false);
            this.activity.toggle();
            console.log("### New Interface BUILD - END - Activity Toggled.");
        };

        // *** NEW Method to build a single Line ***
        this.buildLine = function(row_data) {
            // Validate row data (needs at least 'results' array and maybe 'title')
             if (!row_data || typeof row_data !== 'object' || !Array.isArray(row_data.results)) {
                 console.warn("### New Interface buildLine - Skipping invalid row data:", row_data);
                 return;
             }
             // Skip empty rows
             if (row_data.results.length === 0 && !row_data.more) {
                 console.log("### New Interface buildLine - Skipping empty row:", row_data.title);
                 return;
             }

             console.log("### New Interface buildLine - Building line for:", row_data.title || "Untitled Row");

             try {
                 // Prepare parameters for the Line component
                 let line_params = {
                     object: object,        // Pass the main component's config/context
                     card_small: true,      // Use small cards (adjust if needed)
                     card_wide: true,       // Use wide cards (adjust if needed)
                     // card_collection: row_data.collection, // Pass specific types if available
                     // card_category: row_data.category,
                     // nomore: row_data.nomore,
                     // align_left: true, // Example: Align cards left
                     type: row_data.line_type || 'cards' // Use type from data or default
                 };

                 // Create the Line instance - passing the row object itself as the first argument
                 var line = new Line(row_data, line_params);

                 // --- Setup Event Handlers for the Line ---
                 // When focus changes *within* the line, update the info panel
                 line.onFocus = (card_data)=>{
                     if (info && card_data && card_data.id) { // Check if it's actual movie data
                         info.update(card_data);
                         this.background(card_data);
                     } else if (info) {
                          // console.log("### New Interface line.onFocus - Focused item in line has no ID (maybe 'More' button?). Clearing info.");
                          info.empty(); // Clear info panel if 'More' button or similar is focused
                     }
                 };

                 // Handle enter/select actions within the line
                 line.onEnter = (target, card_data)=>{
                      // Default Lampa behaviour for selecting a card is handled inside Line/Card
                      // We might intercept here if needed
                       console.log("### New Interface line.onEnter:", card_data?.id || card_data?.title || 'More Button');
                 };

                 // Handle reaching the left edge within the line
                 line.onLeft = ()=>{
                      console.log("### New Interface line.onLeft - Reached left edge of line", items.indexOf(line));
                      Controller.toggle('menu'); // Example: Go to menu
                 };

                 // Handle pressing Back within the line
                 line.onBack = this.back.bind(this); // Use component's main back handler

                 // Handle pressing Down/Up when focus is on this line
                 // These should navigate *between* lines (handled by component.down/up)
                 line.onDown = this.down.bind(this);
                 line.onUp = this.up.bind(this);
                 // --- End Event Handlers ---

                 line.create(); // Create the line's internal structure and cards

                 scroll.append(line.render(true)); // Append the line's HTML to the vertical scroll
                 items.push(line); // Add the line instance to our list of lines

             } catch (e) {
                 console.error("### New Interface buildLine - ERROR creating Line for:", row_data.title, e);
             }
        };

        this.background = function (elem) { /* ... background logic (no changes) ... */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (!new_background || new_background === background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); var img = new Image(); img.onload = function () { if (background_last === new_background) { background_img.attr('src', new_background); background_img.addClass('loaded'); } }; img.onerror = function () { if (background_last === new_background) { background_img.removeClass('loaded').attr('src', ''); background_last = ''; } }; background_last = new_background; img.src = new_background; }, 300); };

        // REMOVED original append function - not needed for this structure

        this.back = function () { Lampa.Activity.backward(); };

        // *** MODIFIED Down/Up to navigate between Lines ***
        this.down = function () { // Navigate down to the next Line
            if (!items.length || active >= items.length - 1) return; // Boundary check
            active++;
            active = Math.min(active, items.length - 1); // Ensure valid index
            if (items[active]) {
                 console.log("### New Interface DOWN - Focusing line index:", active);
                 items[active].toggle(); // Tell the newly active line to take focus
                 scroll.update(items[active].render(true), false); // Update vertical scroll position
            }
        };
        this.up = function () { // Navigate up to the previous Line
             if (!items.length || active <= 0) { // Boundary check
                 Lampa.Controller.toggle('head'); // Toggle header if at top
                 return;
             }
             active--;
             if (items[active]) {
                 console.log("### New Interface UP - Focusing line index:", active);
                 items[active].toggle(); // Tell the newly active line to take focus
                 scroll.update(items[active].render(true), false); // Update vertical scroll position
             } else {
                 Lampa.Controller.toggle('head'); // Fallback
             }
        };

        // *** MODIFIED Start/Controller to handle Line focus ***
        this.start = function () {
            console.log("### New Interface START called");
            var _this4 = this;
            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() { // Called when focus returns to this component
                     console.log("### New Interface Controller TOGGLE - Focusing line:", active);
                     if (items.length && items[active]) {
                         items[active].toggle(); // Focus the currently active line
                     } else if (items.length) {
                         active = 0; // Reset to first line if active index invalid
                         items[0].toggle();
                     } else {
                          console.log("### New Interface Controller TOGGLE - No lines, toggling head");
                         Lampa.Controller.toggle('head'); // Or toggle head if no items
                     }
                },
                update: function update() {},
                // Left/Right are handled *inside* the active Line component's controller
                left: function left() { /* Let active line handle left */ },
                right: function right() { /* Let active line handle right */ },
                // Up/Down navigate between lines using component's methods
                up: this.up.bind(this),
                down: this.down.bind(this),
                back: this.back.bind(this)
            });
            Lampa.Controller.toggle('content');
        };

        this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
        this.pause = function () {}; this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () { /* ... destroy logic ... */ try { network.clear(); clearTimeout(background_timer); if (info) info.destroy(); if (items) Lampa.Arrays.destroy(items); items = []; /* Make sure items array is cleared */ if (scroll) scroll.destroy(); if (html) html.remove(); } catch (e) {} scroll = null; network = null; lezydata = null; html = null; background_img = null; info = null; object = null; };
    } // --- End Main Component Class ---


    // --- Plugin Initialization (Function that runs the setup) ---
    function startPlugin() { /* ... startPlugin logic (No changes needed here) ... */ if (window.plugin_new_interface_with_ratings_ready) { return; } window.plugin_new_interface_with_ratings_ready = true; console.log('New Interface Plugin: Starting initialization...'); var old_interface = Lampa.InteractionMain; var new_interface_component = component; if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_new_interface_with_ratings_ready = false; return; } Lampa.InteractionMain = function (object) { var use_new_interface = true; if (!object || typeof object !== 'object') use_new_interface = false; else { if (!(object.source == 'tmdb' || object.source == 'cub')) use_new_interface = false; if (window.innerWidth < 767) use_new_interface = false; if (!Lampa.Account.hasPremium()) use_new_interface = false; if (Lampa.Manifest.app_digital < 153) use_new_interface = false; } var InterfaceClass = use_new_interface ? new_interface_component : old_interface; if (typeof InterfaceClass !== 'function') { InterfaceClass = old_interface; if (typeof InterfaceClass !== 'function') return {}; } return new InterfaceClass(object); }; var style_tag_id = 'new-interface-ratings-style'; if ($('#' + style_tag_id).length === 0) { Lampa.Template.add(style_tag_id, `/* CSS */ <style id="${style_tag_id}">.new-interface{display:flex;flex-direction:column}.new-interface--rows .items-line{margin-bottom:1.5em}.new-interface .card--small.card--wide{width:18.3em}.new-interface-info{position:relative;padding:1.5em;height:24em;flex-shrink:0}.new-interface-info__body{width:80%;padding-top:1.1em}.new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em}.new-interface-info__head span{color:#fff}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em}.new-interface-info__split{margin:0 .8em;font-size:.7em;display:inline-block;vertical-align:middle}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%}.new-interface .card-more__box{padding-bottom:95%}.new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;object-position:center center;opacity:0;transition:opacity .5s ease;z-index:-1}.new-interface .full-start__background.loaded{opacity:1}.new-interface .full-start__rate{font-size:1.3em;margin-right:0;display:inline-flex;flex-direction:column;align-items:center;text-align:center;min-width:3.5em;vertical-align:middle}.new-interface .full-start__rate>div:first-child{font-weight:700;font-size:1.1em}.new-interface .full-start__rate>div:last-child{font-size:.8em;color:rgba(255,255,255,.7);text-transform:uppercase}.new-interface .full-start__rate.loading{min-width:2.5em;color:rgba(255,255,255,.5);justify-content:center;display:inline-flex}.new-interface .full-start__rate.loading>div{display:none}.new-interface .full-start__rate.loading::after{content:'.';animation:dots 1s steps(5,end) infinite;display:inline-block;width:1em;text-align:left;font-size:1.1em;font-weight:700}.new-interface .card__promo{display:none}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%}.new-interface .card.card--wide .card-watched{display:none!important}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em}body.light--version .new-interface-info{height:25.3em}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}@keyframes dots{0%,20%{color:transparent;text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}40%{color:rgba(255,255,255,.5);text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}60%{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 transparent}80%,to{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 rgba(255,255,255,.5)}}</style>`); $('body').append(Lampa.Template.get(style_tag_id, {}, true)); } console.log('New Interface Plugin: Initialization complete.'); }

    // *** Initialization Logic with Polling (No Changes Here) ***
    function checkAndInitialize() { var lampaReady = window.Lampa?.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain && Lampa.InteractionLine; var fetcherReady = window.ExternalRatingsFetcher?.fetch; if (lampaReady && fetcherReady) { startPlugin(); return true; } return false; } // Added Lampa.InteractionLine check
    if (!checkAndInitialize()) { var checkInterval = 250; var maxWaitTime = 15000; var timeWaited = 0; var initIntervalTimer = null; console.log('New Interface Plugin: Prerequisites not met. Starting polling...'); initIntervalTimer = setInterval(function() { timeWaited += checkInterval; if (checkAndInitialize()) { clearInterval(initIntervalTimer); } else if (timeWaited >= maxWaitTime) { clearInterval(initIntervalTimer); console.error('New Interface Plugin Error: Timed out waiting for Lampa and/or ExternalRatingsFetcher plugin.'); } }, checkInterval); }

})(); // --- End IIFE ---
