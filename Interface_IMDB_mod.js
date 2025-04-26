// == Original New Interface Script (Modified for Row Data & Ratings) ==

(function () {
    'use strict';

    // --- Info Panel Class ('create' function from original script) ---
    function create() {
      var html;
      var timer;
      var network = new Lampa.Reguest();
      var loaded = {};

      this.create = function () {
        // Original HTML structure
        html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
      };

      this.update = function (data) {
        // Original update logic - clears fields, sets basic title/desc, calls load
        if (!data) return; // Basic check
        if(!html) this.create(); // Ensure HTML exists

        html.find('.new-interface-info__head,.new-interface-info__details').text('---');
        html.find('.new-interface-info__title').text(data.title || data.name || ''); // Use title/name
        html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
        // Background is handled by component's background method
        this.load(data); // Trigger detailed load
      };

      // *** MODIFIED: info.draw - Added Rating Placeholders & Fetcher Call ***
      this.draw = function (data) { // data is the detailed TMDB movie object
            if (!html) { console.error("InfoPanel draw - 'html' is not defined!"); return; }
            if (!data || typeof data !== 'object' || !data.id) { if(html) html.find('.new-interface-info__details').empty().text('Error loading details.'); return; }

            var movie_id = data.id; // Use ID for unique placeholders

            // --- Original logic for head, year, vote_tmdb, countries, pg, genres, runtime ---
            var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [];
            var details = []; // Array to build details HTML strings
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            if (create !== '0000') head.push('<span>' + create + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // --- Details ---
            var rating_details = []; // Keep ratings separate temporarily
            var other_details = [];  // Keep other details separate

            // 1. Add TMDB Rating (Original Logic)
            if (vote > 0) {
                rating_details.push('<div class="full-start__rate rate--tmdb"><div>' + vote + '</div><div>TMDB</div></div>');
            }

            // 2. ADD Placeholders for KP and IMDB Ratings
            rating_details.push('<div class="full-start__rate rate--imdb loading" id="imdb-rating-' + movie_id + '">...</div>');
            rating_elements.push('<div class="full-start__rate rate--kp loading" id="kp-rating-' + movie_id + '">...</div>');


            // 3. Add Genres, Runtime, PG (Original Logic)
            if (data.genres && data.genres.length > 0) {
                 other_details.push(data.genres.map(function (item) {
                    return Lampa.Utils.capitalizeFirstLetter(item.name);
                }).join(' | '));
            }
            if (data.runtime) {
                 other_details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            }
            if (pg) {
                 other_details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');
            }

            // 4. Combine details HTML with splitters (modified slightly)
            var final_details_html = rating_details.join('<span class="new-interface-info__split rating-splitter">&#9679;</span>'); // Splitters between ratings
            if (rating_details.length > 0 && other_details.length > 0) {
                 final_details_html += '<span class="new-interface-info__split details-splitter">&#9679;</span>'; // Splitter between ratings and rest
            }
            final_details_html += other_details.join('<span class="new-interface-info__split">&#9679;</span>'); // Splitters within other details

            // Update DOM (Original logic)
            html.find('.new-interface-info__head').empty().append(head.join(', '));
            var details_container = html.find('.new-interface-info__details').html(final_details_html); // Render structure

            // Update description (Original logic)
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));

            // 5. CALL the External Ratings Fetcher Plugin
            if (window.ExternalRatingsFetcher?.fetch) {
                var data_for_fetcher = { id: data.id, title: data.title || data.name, original_title: data.original_title || data.original_name, release_date: data.release_date || data.first_air_date, imdb_id: data.imdb_id };
                window.ExternalRatingsFetcher.fetch(data_for_fetcher, function(ratings) {
                    // --- Callback to update rating placeholders ---
                    var imdb_placeholder = html.find('#imdb-rating-' + movie_id);
                    var kp_placeholder = html.find('#kp-rating-' + movie_id);
                    if (!imdb_placeholder.length && !kp_placeholder.length) { return; } // Exit if panel gone

                    imdb_placeholder.removeClass('loading').empty(); kp_placeholder.removeClass('loading').empty();
                    var kp_rating_str = (ratings.kp && !isNaN(ratings.kp)) ? parseFloat(ratings.kp).toFixed(1) : '0';
                    var imdb_rating_str = (ratings.imdb && !isNaN(ratings.imdb)) ? parseFloat(ratings.imdb).toFixed(1) : '0';

                    if (parseFloat(imdb_rating_str) > 0) { imdb_placeholder.append('<div>' + imdb_rating_str + '</div><div>IMDb</div>').show(); } else { imdb_placeholder.hide(); }
                    if (parseFloat(kp_rating_str) > 0) { kp_placeholder.append('<div>' + kp_rating_str + '</div><div>KP</div>').show(); } else { kp_placeholder.hide(); }

                    // --- Dynamic Splitter Logic (copied from previous version) ---
                    details_container.find('.rating-splitter, .details-splitter').remove(); // Clear old splitters
                    var visible_ratings = details_container.find('.full-start__rate:visible');
                    visible_ratings.each(function(index) { if (index < visible_ratings.length - 1) { $(this).after('<span class="new-interface-info__split rating-splitter">&#9679;</span>'); } });
                    // Show splitter between ratings and rest only if both exist
                    if (visible_ratings.length > 0 && other_details.length > 0) {
                         // Insert splitter after the last visible rating element
                         visible_ratings.last().after('<span class="new-interface-info__split details-splitter">&#9679;</span>');
                    }
                    // --- End Splitter Logic ---
                });
            } else {
                console.error("Ratings Fetcher not found!");
                if(html) html.find('#imdb-rating-' + movie_id + ', #kp-rating-' + movie_id).hide();
            }
      }; // *** End MODIFIED info.draw ***

      // *** MODIFIED: info.load - Added external_ids ***
      this.load = function (data) {
            var _this = this;
            clearTimeout(timer);

            // Fetch detailed data from TMDB, ensuring 'external_ids' is appended
            var media_type = data.name ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(media_type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates,external_ids&language=' + Lampa.Storage.get('language')); // Added external_ids

            if (loaded[url]) { // Check cache
                 // Ensure imdb_id exists on cached data
                 if (loaded[url].external_ids && !loaded[url].imdb_id) { loaded[url].imdb_id = loaded[url].external_ids.imdb_id; }
                 // Ensure title consistency
                 if (!loaded[url].title && loaded[url].name) { loaded[url].title = loaded[url].name; }
                 if (!loaded[url].original_title && loaded[url].original_name) { loaded[url].original_title = loaded[url].original_name; }
                 return this.draw(loaded[url]); // Use cached data
            }

            // Fetch if not cached
            timer = setTimeout(function () {
              network.clear();
              network.timeout(5000);
              network.silent(url, function (movie) { // movie is detailed data
                // Process external_ids
                if (movie.external_ids) {
                    movie.imdb_id = movie.external_ids.imdb_id;
                }
                 // Ensure title consistency
                 if (!movie.title && movie.name) { movie.title = movie.name; }
                 if (!movie.original_title && movie.original_name) { movie.original_title = movie.original_name; }

                loaded[url] = movie; // Cache result
                _this.draw(movie); // Draw with detailed data
              }, function(a,c){ // Error handling
                  console.error("InfoPanel TMDB Load Error:", network.errorDecode(a,c));
                   if(html) html.find('.new-interface-info__details').empty().text('Error loading details.');
              });
            }, 300); // Original delay
      }; // *** End MODIFIED info.load ***

      this.render = function () { return html; };
      this.empty = function () { if(html){ html.find('.new-interface-info__head,.new-interface-info__details,.new-interface-info__title,.new-interface-info__description').empty().text('');} }; // Clear panel
      this.destroy = function () { if(html) html.remove(); loaded = {}; html = null; network.clear(); }; // Original destroy
    } // --- End Info Panel Class ---


    // --- Main Component Class (Original Structure) ---
    function component(object) { // object likely contains {component: 'main', source: 'tmdb'}
      var network = new Lampa.Reguest();
      var scroll = new Lampa.Scroll({ // Original scroll setup
        mask: true,
        over: true,
        scroll_by_item: true // This implies vertical scrolling of items/cards
      });
      var items = []; // Holds InteractionLine instances (for individual cards)
      var html = $('<div class="new-interface"><img class="full-start__background"></div>'); // Original main div
      var active = 0; // Active card index
      var newlampa = Lampa.Manifest.app_digital >= 166;
      var info; // Info panel instance
      var lezydata; // Holds the full list of movies extracted from the first row
      var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
      var background_img = html.find('.full-start__background');
      var background_last = '';
      var background_timer;

      this.create = function () {
          // Create info panel instance
          info = new create(); // Use the modified create function
          info.create();
          // Prepend info panel to main html
          html.prepend(info.render()); // Prepend info panel
      };

      this.empty = function () { /* ... original empty logic ... */ var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); if(html) html.append(empty.render(button)); this.start = empty.start; if(this.activity) this.activity.loader(false); if(this.activity) this.activity.toggle(); };
      this.loadNext = function () { /* ... original load next logic ... */ var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; var results = Array.isArray(new_data) ? new_data : (new_data?.results || []); results.forEach(_this.append.bind(_this)); if (items[active + 1]) { Lampa.Layer.visible(items[active + 1].render(true)); } }, function () { _this.next_wait = false; }); } }; // Note: 'this.next' might need adjustment depending on how Lampa provides pagination for the extracted movie list.
      this.push = function () {};

      // *** MODIFIED: component.build - Extract first movie row, populate based on that ***
      this.build = function (data) { // data contains rows/categories in data.results
            console.log("### Original Structure BUILD - START. Received data:", JSON.stringify(data).slice(0, 300) + '...');
            var _this2 = this;
            items = []; // Reset items
            active = 0; // Reset active index

            // --- Find the first row containing actual movie results ---
            var firstMovieRowData = null;
            var rows_to_process = Array.isArray(data) ? data : (data?.results || []);
            console.log("### Original Structure BUILD - Found", rows_to_process.length, "initial rows.");

            for (let i = 0; i < rows_to_process.length; i++) {
                let row = rows_to_process[i];
                if (row && typeof row === 'object' && Array.isArray(row.results) && row.results.length > 0 && row.results[0].id) {
                     console.log("### Original Structure BUILD - Found movie row:", row.title);
                     firstMovieRowData = row.results; // Get the array of movies from this row
                     lezydata = firstMovieRowData; // Store this list for potential lazy load
                     break; // Stop after finding the first valid row
                }
            }
            // --- End Finding Row ---

            if (!firstMovieRowData) {
                console.warn("### Original Structure BUILD - No valid movie row found in data.");
                this.empty(); // Show empty state if no movies found
                return;
            }

            console.log("### Original Structure BUILD - Using", firstMovieRowData.length, "movies from first valid row.");

            // Original scroll setup
            scroll.minus(info.render()); // Exclude info panel from scroll

            // Append only a few initial items from the first movie row
            firstMovieRowData.slice(0, viewall ? firstMovieRowData.length : 2).forEach(this.append.bind(this));
            console.log("### Original Structure BUILD - Finished appending initial cards. Total cards:", items.length);


            // Append scroll container (containing cards) after the info panel
            html.append(scroll.render()); // Append scroll container

            // Update info panel and background with the very first movie item
            if (items.length > 0) {
                 console.log("### Original Structure BUILD - Updating info/background for first card:", items[0].data?.id);
                 info.update(items[0].data); // Use modified info.update
                 this.background(items[0].data);
            } else {
                 console.warn("### Original Structure BUILD - No items appended, cannot set initial info/background.");
                 if(info) info.empty(); // Clear info panel if no items loaded
            }

            // Original Lampa layer/scroll handling for this component type
            if (newlampa) {
                Lampa.Layer.update(html);
                Lampa.Layer.visible(scroll.render(true)); // This might be correct for this structure
                scroll.onEnd = this.loadNext.bind(this); // Setup infinite scroll based on lezydata
                scroll.onWheel = function (step) {
                    if (!Lampa.Controller.own(_this2)) _this2.start();
                    if (step > 0) _this2.down();
                    else if (active > 0) _this2.up();
                };
            }

            this.activity.loader(false);
            this.activity.toggle();
             console.log("### Original Structure BUILD - END.");
      }; // *** End MODIFIED component.build ***

      this.background = function (elem) { /* ... original background logic ... */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (!new_background || new_background === background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); var img = new Image(); img.onload = function () { if (background_last === new_background) { background_img.attr('src', new_background); background_img.addClass('loaded'); } }; img.onerror = function () { if (background_last === new_background) { background_img.removeClass('loaded').attr('src', ''); background_last = ''; } }; background_last = new_background; img.src = new_background; }, 100); };

      // *** component.append using ORIGINAL parameters ***
      this.append = function (element) {
        // This function now receives individual movie objects from firstMovieRowData
        console.log("### Original Structure APPEND - START for:", element?.id, element?.title);
        var _this3 = this;
        // Basic validation (check it's an object with an ID)
        if (!element || typeof element !== 'object' || !element.id) {
             console.warn("### Original Structure APPEND - Invalid movie element:", element);
             return;
        }
        // Duplicate check
        if (items.some(function(itm){ return itm.data && itm.data.id === element.id; })) {
            console.log("### Original Structure APPEND - Skipping duplicate card:", element.id); return; };

        if (element.ready) return;
        element.ready = true;
        if (!element.title && element.name) element.title = element.name;
        if (!element.original_title && element.original_name) element.original_title = element.original_name;

        // Create InteractionLine instance with original parameters
        var item = new Lampa.InteractionLine(element, {
            url: element.url,           // Original
            card_small: true,
            cardClass: element.cardClass, // Original
            genres: object.genres,      // Original
            object: object,             // Original
            card_wide: true,            // Original setting for this layout
            nomore: element.nomore      // Original
        });
        item.create();

        // Original event handlers
        item.onDown = this.down.bind(this);
        item.onUp = this.up.bind(this);
        item.onBack = this.back.bind(this);
        item.onToggle = function () { active = items.indexOf(item); }; // Original active index update
        if (this.onMore) item.onMore = this.onMore.bind(this);

        // Update info panel/background on focus/hover
        item.onFocus = function (/*elem - DOM element*/) { // Original didn't use DOM elem arg here
             // console.log("### Original Structure onFocus:", item.data?.id); // Keep item.data reference
             if (info && item.data) { // Use item.data stored by InteractionLine
                 info.update(item.data); // Use modified info.update
                 _this3.background(item.data);
             }
        };
        item.onHover = function (/*elem*/) {
            // console.log("### Original Structure onHover:", item.data?.id);
             if (info && item.data) {
                 info.update(item.data);
                 _this3.background(item.data);
             }
        };
        item.onFocusMore = info.empty.bind(info); // Original

        // Original append to scroll
        scroll.append(item.render());
        items.push(item);
        console.log("### Original Structure APPEND - END. Total cards:", items.length);
      }; // *** End component.append ***


      this.back = function () { Lampa.Activity.backward(); };
      this.down = function () { /* ... original down logic ... */ active++; active = Math.min(active, items.length - 1); if(!viewall && lezydata) { lezydata.slice(0, active + 2).forEach(this.append.bind(this)); } if(items[active]) { items[active].toggle(); scroll.update(items[active].render()); } };
      this.up = function () { /* ... original up logic ... */ active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { if(items[active]) { items[active].toggle(); scroll.update(items[active].render()); } } };
      this.start = function () { /* ... original start/controller logic ... */ var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { _this4.up(); }, down: function down() { _this4.down(); }, back: this.back }); Lampa.Controller.toggle('content'); }; // Note: simplified up/down calls slightly
      this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
      this.pause = function () {}; this.stop = function () {};
      this.render = function () { return html; };
      this.destroy = function () { /* ... original destroy logic ... */ network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); html.remove(); items = null; network = null; lezydata = null; html=null; info=null; object=null; background_img=null; clearTimeout(background_timer); };
    } // --- End Main Component Class ---

    // --- Plugin Initialization ---
    function startPlugin() {
        // Check if already initialized
        if (window.plugin_new_interface_original_structure_ready) { return; }
        window.plugin_new_interface_original_structure_ready = true; // Use a new flag name

        console.log('New Interface Plugin (Original Structure): Starting initialization...');
        var old_interface = Lampa.InteractionMain;
        var new_interface_component = component; // Use the component defined above

        if (typeof Lampa.InteractionMain !== 'function') { console.error("New Interface Plugin Error: Lampa.InteractionMain not found."); window.plugin_new_interface_original_structure_ready = false; return; }

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

            // *Crucially*, check if the component is 'main'. If so, maybe use the old interface for now?
            // Or let our modified component try to handle it. Let's let it try.
            // if (object.component === 'main') use_new_interface = false; // Optional: Force old for main if needed

            var InterfaceClass = use_new_interface ? new_interface_component : old_interface;
            if (typeof InterfaceClass !== 'function') { InterfaceClass = old_interface; if (typeof InterfaceClass !== 'function') return {}; }
            console.log("New Interface Plugin (Original Structure): Using", use_new_interface ? "New Interface" : "Old Interface", "for component:", object?.component);
            return new InterfaceClass(object);
        };

        // --- CSS Styles ---
        var style_tag_id = 'new-interface-ratings-style'; // Reuse same ID or use new one
        if ($('#' + style_tag_id).length === 0) {
             Lampa.Template.add(style_tag_id, `/* CSS */ <style id="${style_tag_id}">.new-interface{/* Might need display:flex; flex-direction:column; */ width: 100%; height: 100%;} .new-interface .scroll{/* Might need flex-grow:1; overflow-y:auto; */} .new-interface--rows .items-line{margin-bottom:1.5em} /* This class is no longer added, remove if desired */ .new-interface .card--small.card--wide{width:18.3em}.new-interface-info{position:relative;padding:1.5em;height:24em;flex-shrink:0}.new-interface-info__body{width:80%;padding-top:1.1em}.new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em}.new-interface-info__head span{color:#fff}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em}.new-interface-info__split{margin:0 .8em;font-size:.7em;display:inline-block;vertical-align:middle}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%}.new-interface .card-more__box{padding-bottom:95%}.new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;object-position:center center;opacity:0;transition:opacity .5s ease;z-index:-1}.new-interface .full-start__background.loaded{opacity:1}.new-interface .full-start__rate{font-size:1.3em;margin-right:0;display:inline-flex;flex-direction:column;align-items:center;text-align:center;min-width:3.5em;vertical-align:middle}.new-interface .full-start__rate>div:first-child{font-weight:700;font-size:1.1em}.new-interface .full-start__rate>div:last-child{font-size:.8em;color:rgba(255,255,255,.7);text-transform:uppercase}.new-interface .full-start__rate.loading{min-width:2.5em;color:rgba(255,255,255,.5);justify-content:center;display:inline-flex}.new-interface .full-start__rate.loading>div{display:none}.new-interface .full-start__rate.loading::after{content:'.';animation:dots 1s steps(5,end) infinite;display:inline-block;width:1em;text-align:left;font-size:1.1em;font-weight:700}.new-interface .card__promo{display:none}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%}.new-interface .card.card--wide .card-watched{display:none!important}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em}body.light--version .new-interface-info{height:25.3em}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}@keyframes dots{0%,20%{color:transparent;text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}40%{color:rgba(255,255,255,.5);text-shadow:.25em 0 0 transparent,.5em 0 0 transparent}60%{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 transparent}80%,to{text-shadow:.25em 0 0 rgba(255,255,255,.5),.5em 0 0 rgba(255,255,255,.5)}}</style>`);
             $('body').append(Lampa.Template.get(style_tag_id, {}, true));
        }
        console.log('New Interface Plugin (Original Structure): Initialization complete.');
    }

    // *** Initialization Logic with Polling ***
    function checkAndInitialize() { var lampaReady = window.Lampa?.Api && Lampa.Utils && Lampa.Storage && Lampa.Template && Lampa.TMDB && Lampa.InteractionMain && Lampa.InteractionLine; var fetcherReady = window.ExternalRatingsFetcher?.fetch; if (lampaReady && fetcherReady) { startPlugin(); return true; } return false; }
    if (!checkAndInitialize()) { var checkInterval = 250; var maxWaitTime = 15000; var timeWaited = 0; var initIntervalTimer = null; console.log('New Interface Plugin (Original Structure): Prerequisites not met. Starting polling...'); initIntervalTimer = setInterval(function() { timeWaited += checkInterval; if (checkAndInitialize()) { clearInterval(initIntervalTimer); } else if (timeWaited >= maxWaitTime) { clearInterval(initIntervalTimer); console.error('New Interface Plugin Error: Timed out waiting for Lampa and/or ExternalRatingsFetcher plugin.'); } }, checkInterval); }

})();
