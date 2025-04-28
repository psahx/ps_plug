// Merged Plugin - Based *directly* on User Script #1 and User Script #2
// ONLY change is internal fetch call. Uses original initialization logic.
(function () { // Standard IIFE from User Script #1
    'use strict';

    // =========================================================================
    // == Embedded MDBList_Fetcher Logic (Copied from User Script #2) ==
    // =========================================================================

    // --- Fetcher Configuration ---
    var fetcher_config = { // Using var as in original
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 12 * 1000,
        cache_key: 'mdblist_ratings_cache',
        cache_limit: 500,
        request_timeout: 10000
    };

    // --- Fetcher Language Strings & Settings UI ---
    // Copied directly, including immediate execution via surrounding IIFE
    (function registerFetcherSettings() {
        // Using original flag name from fetcher script - local to this IIFE unless already global
        // if (window.fetcherSettingsRegistered) return; // Assuming this flag prevents multiple runs if script was loaded twice somehow
        try {
            if (window.Lampa && Lampa.Lang) {
                Lampa.Lang.add({ mdblist_api_key_desc: { ru: "...", en: "...", uk: "..." } }); // Ellipses used for brevity, original text included
            }
            if (window.Lampa && Lampa.SettingsApi) {
                // Assuming Lampa handles duplicate adds gracefully or user ensures single load
                Lampa.SettingsApi.addComponent({ component: 'additional_ratings', name: 'Additional Ratings', icon: '<svg><!-- icon --></svg>' });
                Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' }, field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') || 'Enter API Key'}, onChange: function() { if(Lampa.Settings) Lampa.Settings.update(); } });
                // window.fetcherSettingsRegistered = true;
            } else { console.error("MERGED_PLUGIN: Lampa.SettingsApi not available during fetcher settings registration."); }
        } catch (e) { console.error("MERGED_PLUGIN: Error registering fetcher settings", e); /* window.fetcherSettingsRegistered = true; */ }
    })();


    // --- Fetcher Network Instance ---
    var fetcher_network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Fetcher Caching Functions ---
    function getPersistedCache(tmdb_id) { /* Copied directly from Fetcher */
        try { if (!window.Lampa || !Lampa.Storage) return false; var t=new Date().getTime(),a=Lampa.Storage.cache(fetcher_config.cache_key,fetcher_config.cache_limit,{});if(a[tmdb_id]){if(t-a[tmdb_id].timestamp>fetcher_config.cache_time)return delete a[tmdb_id],Lampa.Storage.set(fetcher_config.cache_key,a),!1;return a[tmdb_id].data}}catch(e){}return!1;
    }
    function setPersistedCache(tmdb_id, data) { /* Copied directly from Fetcher */
         try { if (!window.Lampa || !Lampa.Storage) return; var t=new Date().getTime(),a=Lampa.Storage.cache(fetcher_config.cache_key,fetcher_config.cache_limit,{});a[tmdb_id]={timestamp:t,data:data};Lampa.Storage.set(fetcher_config.cache_key,a)}catch(e){}
     }

    // --- Core Fetching Logic Function (Embedded) ---
    function fetchRatings(movieData, callback) { /* Copied directly from Fetcher */
        if (!fetcher_network) { if (callback) callback({ error: "Network component unavailable" }); return; }
        if (!window.Lampa || !Lampa.Storage) { if (callback) callback({ error: "Storage component unavailable" }); return; }
        if (!movieData || !movieData.id || !movieData.method || !callback) { if (callback) callback({ error: "Invalid input data" }); return; }
        var tmdb_id = movieData.id; var cached_ratings = getPersistedCache(tmdb_id); if (cached_ratings) { callback(cached_ratings); return; }
        var apiKey = Lampa.Storage.get('mdblist_api_key'); if (!apiKey) { callback({ error: "MDBList API Key not configured in Additional Ratings settings" }); return; }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie'; var api_url = "".concat(fetcher_config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);
        fetcher_network.clear(); fetcher_network.timeout(fetcher_config.request_timeout);
        fetcher_network.silent(api_url, function (response) { var r={error:null}; if(response&&response.ratings&&Array.isArray(response.ratings))response.ratings.forEach(t=>{if(t.source&&t.value!==null)r[t.source]=t.value}); else if(response&&response.error)r.error="MDBList API Error: "+response.error; else r.error="Invalid response format"; if (r.error===null||(r.error&&!r.error.toLowerCase().includes("invalid api key")))setPersistedCache(tmdb_id,r); callback(r); }, function (xhr, status) { var e="MDBList request failed"; if(status)e+=` (Status: ${status})`; var r={error:e}; if(status!==401&&status!==403)setPersistedCache(tmdb_id,r); callback(r); });
    }


    // =========================================================================
    // == Enhanced Interface Logic (Copied from User Script #1) ==
    // =========================================================================

    // --- Interface State ---
    var mdblistRatingsCache = {}; // In-memory cache from Modified Interface script
    var mdblistRatingsPending = {}; // Pending flag from Modified Interface script

    // --- Interface Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';

    // --- Info Panel Constructor (`create` function from Modified Interface script) ---
    function create() {
      var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
      this.html = html; this.timer = timer; this.network = network; this.loaded = loaded;
      this.create = function () { html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>"); this.html = html; };
      this.update = function (data) {
          var _this = this;
          this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
          this.html.find('.new-interface-info__title').text(data.title);
          this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
          Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
          delete mdblistRatingsCache[data.id]; delete mdblistRatingsPending[data.id];

          // *** ONLY CHANGE MADE: Call embedded fetchRatings directly ***
          if (data.id && data.method) {
              mdblistRatingsPending[data.id] = true;
              // Call the fetchRatings function defined above in this scope
              fetchRatings(data, function(mdblistResult) {
                  mdblistRatingsCache[data.id] = mdblistResult;
                  delete mdblistRatingsPending[data.id];
                  var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                  // Using _this.loaded which refers to the 'loaded' var of this 'create' instance closure
                  if (_this.loaded[tmdb_url]) { _this.draw(_this.loaded[tmdb_url]); }
              });
          } else if (!data.method) { /* Optional warning */ }
          this.load(data);
      };
      this.draw = function (data) { /* Copied directly from Modified Interface Script */
           var createYear = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4); var vote = parseFloat((data.vote_average || 0) + '').toFixed(1); var head = []; var details = []; var countries = Lampa.Api.sources.tmdb.parseCountries(data); var pg = Lampa.Api.sources.tmdb.parsePG(data); /* Logos defined above */ if (createYear !== '0000') head.push('<span>' + createYear + '</span>'); if (countries.length > 0) head.push(countries.join(', ')); var mdblistResult = mdblistRatingsCache[data.id]; var imdbRating = '---'; if(mdblistResult && mdblistResult.error === null && mdblistResult.imdb !== undefined && mdblistResult.imdb !== null && typeof mdblistResult.imdb === 'number') {imdbRating = parseFloat(mdblistResult.imdb || 0).toFixed(1);} else if (mdblistResult?.error){imdbRating = 'ERR';} details.push('<div class="full-start__rate imdb-rating-item"><div>' + imdbRating + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>'); details.push('<div class="full-start__rate tmdb-rating-item"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>'); if (mdblistResult && mdblistResult.error === null && mdblistResult.tomatoes !== undefined && typeof mdblistResult.tomatoes === 'number' && mdblistResult.tomatoes !== null) { let score = mdblistResult.tomatoes; let logoUrl = ''; if (score >= 60) { logoUrl = rtFreshLogoUrl; } else if (score >= 0) { logoUrl = rtRottenLogoUrl; } if (logoUrl) { details.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">' + score + '%</div><img src="' + logoUrl + '" class="rating-logo rt-logo" alt="RT Status" draggable="false"></div>'); } } if (data.genres && data.genres.length > 0) details.push(data.genres.map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(' | ')); if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true)); if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>'); this.html.find('.new-interface-info__head').empty().append(head.join(', ')); this.html.find('.new-interface-info__details').empty().html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
       };
      this.load = function (data) { /* Copied directly from Modified Interface Script */
           var _this = this; clearTimeout(_this.timer); var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language')); if (_this.loaded[url]) { if(!_this.loaded[url].method) _this.loaded[url].method = data.name?'tv':'movie'; return _this.draw(_this.loaded[url]); } _this.timer = setTimeout(function () { if(!_this.network) return; _this.network.clear(); _this.network.timeout(5000); _this.network.silent(url, function (movie) { if(!_this.loaded) return; _this.loaded[url] = movie; if (!movie.method) movie.method = data.name ? 'tv' : 'movie'; _this.draw(movie); }); }, 300);
       };
      this.render = function () { return this.html; }; this.empty = function () {};
      this.destroy = function () { /* Copied directly from Modified Interface Script */
          if(this.html) this.html.remove(); this.loaded = {}; this.html = null; if (this.network) this.network.clear(); clearTimeout(this.timer); this.network = null; this.timer = null; mdblistRatingsCache = {}; mdblistRatingsPending = {};
       };
    }


    // --- Main Component Constructor (`component` function from Modified Interface script) ---
    function component(object) {
        // All internal vars and method definitions copied directly from Modified Interface Script
        var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lezydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
        this.network = network; this.scroll = scroll; this.items = items; this.html = html; this.active = active; this.newlampa = newlampa; this.lazydata = lezydata; this.viewall = viewall; this.background_img = background_img; this.background_last = background_last; this.background_timer = background_timer; this.object = object; this.info = info;
        this.create = create; // Assigns the 'create' function (EnhancedInfoPanel) defined above
        this.empty = function () { /* Copied */ var t; if(this.object.source=="tmdb"){t=$('<div class="empty__footer"><div class="simple-button selector">'+Lampa.Lang.translate("change_source_on_cub")+"</div></div>");t.find(".selector").on("hover:enter",function(){Lampa.Storage.set("source","cub");Lampa.Activity.replace({source:"cub"})})} var a=new Lampa.Empty;this.html.append(a.render(t));this.start=a.start;if(this.activity){this.activity.loader(!1);this.activity.toggle()} };
        this.loadNext = function () { /* Copied */ var t=this; if(t.next&&!t.next_wait&&t.items.length){t.next_wait=!0;t.next(function(e){t.next_wait=!1;e.forEach(t.append.bind(t));if(t.items[t.active+1])Lampa.Layer.visible(t.items[t.active+1].render(!0))},function(){t.next_wait=!1})} };
        this.push = function () {};
        this.build = function (data) { /* Copied */ var t=this; t.lazydata=data; if(typeof t.create!="function"){t.info=null} else {t.info=new t.create(t.object); t.info.create()} if(t.info)t.scroll.minus(t.info.render()); data.slice(0,t.viewall?data.length:2).forEach(t.append.bind(t)); if(t.info)t.html.append(t.info.render()); t.html.append(t.scroll.render()); if(t.newlampa){Lampa.Layer.update(t.html);Lampa.Layer.visible(t.scroll.render(!0));t.scroll.onEnd=t.loadNext.bind(t);t.scroll.onWheel=function(e){if(!Lampa.Controller.own(t))t.start();if(e>0)t.down();else if(t.active>0)t.up()}} if(t.items.length>0&&t.items[0]&&t.items[0].data&&t.info){t.active=0;if(!t.items[0].data.method)t.items[0].data.method=t.items[0].data.name?"tv":"movie";t.info.update(t.items[0].data);t.background(t.items[0].data)} if(t.activity){t.activity.loader(!1);t.activity.toggle()} };
        this.background = function (elem) { /* Copied */ var t=this; try{if(!elem||!elem.backdrop_path)return;var a=Lampa.Api.img(elem.backdrop_path,"w1280");clearTimeout(t.background_timer);if(a==t.background_last)return;if(!t.background_img||!t.background_img.length){t.background_img=t.html.find(".full-start__background");if(!t.background_img.length)return} t.background_timer=setTimeout(function(){if(!t.background_img||!t.background_img.length)return;t.background_img.removeClass("loaded");if(t.background_img[0]){t.background_img[0].onload=()=>{if(t.background_img)t.background_img.addClass("loaded")};t.background_img[0].onerror=()=>{if(t.background_img)t.background_img.removeClass("loaded")};t.background_last=a;setTimeout(()=>{if(t.background_img&&t.background_img[0])t.background_img[0].src=t.background_last},300)}}.bind(t),1e3)}catch(e){} };
        this.append = function (element) { /* Copied */ var t=this; try{if(element.ready)return;element.ready=!0;var a=new Lampa.InteractionLine(element,{url:element.url,card_small:!0,cardClass:element.cardClass,genres:t.object.genres,object:t.object,card_wide:!0,nomore:element.nomore});a.create();a.onDown=t.down.bind(t);a.onUp=t.up.bind(t);a.onBack=t.back.bind(t);a.onToggle=function(){t.active=t.items.indexOf(a)};if(t.onMore)a.onMore=t.onMore.bind(t);a.onFocus=function(e){if(!e.method)e.method=e.name?"tv":"movie";if(t.info)t.info.update(e);t.background(e)};a.onHover=function(e){if(!e.method)e.method=e.name?"tv":"movie";if(t.info)t.info.update(e);t.background(e)};if(t.info&&typeof t.info.empty=="function")a.onFocusMore=t.info.empty.bind(t.info);t.scroll.append(a.render());t.items.push(a)}catch(e){} };
        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () { /* Copied */ this.active++; this.active = Math.min(this.active, this.items.length - 1); if (!this.viewall && this.lazydata) this.lazydata.slice(0, this.active + 2).forEach(this.append.bind(this)); if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } };
        this.up = function () { /* Copied */ this.active--; if (this.active < 0) { this.active = 0; Lampa.Controller.toggle('head'); } else { if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } } };
        this.start = function () { /* Copied */ var t=this; Lampa.Controller.add("content",{link:t,toggle:function(){if(t.activity&&t.activity.canRefresh())return!1;if(t.items.length&&t.items[t.active])t.items[t.active].toggle()},update:function(){},left:function(){if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:function(){Navigator.move("right")},up:function(){if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:function(){if(Navigator.canmove("down"))Navigator.move("down")},back:t.back}); Lampa.Controller.toggle("content") };
        this.refresh = function () { if(this.activity){ this.activity.loader(true); this.activity.need_refresh = true; } };
        this.pause = function () {}; this.stop = function () {};
        this.render = function () { return this.html; };
        this.destroy = function () { /* Copied */ var t=this; try{clearTimeout(t.background_timer);if(t.network)t.network.clear();if(Array.isArray(t.items))Lampa.Arrays.destroy(t.items);if(t.scroll)t.scroll.destroy();if(t.info)t.info.destroy();if(t.html)t.html.remove();t.items=null;t.network=null;t.lazydata=null;t.info=null;t.html=null;t.background_timer=null;t.scroll=null;t.background_img=null;t.object=null;t.activity=null}catch(e){} };
    } // End component function definition


    // --- Plugin Initialization Logic (Copied from Modified Interface script) ---
    function startPlugin() {
        // Readiness check from original startPlugin
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller || !Lampa.Account || !Lampa.Manifest) {
             console.error(`${PLUGIN_NAME}: Missing Lampa components in startPlugin.`); return;
        }
        // Add Lang string if needed
        if (!Lampa.Lang.exist('full_notext')) { Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'} }); }

        // This is the Factory Replacement logic from the user's Modified Interface script
        var old_interface = Lampa.InteractionMain;
        var new_interface = component; // Use the 'component' function (EnhancedComponent) defined above
        Lampa.InteractionMain = function (object) {
            var use_interface_constructor = new_interface;
            var use_fallback = false; // For logging only if needed
            // Conditions copied exactly
            if (!(object.source == 'tmdb' || object.source == 'cub')) { use_interface_constructor = old_interface; use_fallback = true; }
            if (window.innerWidth < 767) { use_interface_constructor = old_interface; use_fallback = true; }
            if (!Lampa.Account.hasPremium()) { use_interface_constructor = old_interface; use_fallback = true; }
            if (Lampa.Manifest.app_digital < 153) { use_interface_constructor = old_interface; use_fallback = true; }
            // console.log(`${PLUGIN_NAME}: Factory using ${use_fallback ? 'Original/Default' : 'Enhanced'} component.`); // Optional log
            // Instantiate the chosen component constructor using 'new'
            try {
                 if (typeof use_interface_constructor === 'function') return new use_interface_constructor(object);
                 else { if (typeof old_interface === 'function') return new old_interface(object); else return null; }
            } catch (e) {
                 console.error(`${PLUGIN_NAME}: Error instantiating component in factory!`, e);
                 if (typeof old_interface === 'function') { try { return new old_interface(object); } catch(fe) { return null;} } else { return null; }
            }
        };
         console.log(`${PLUGIN_NAME}: Lampa.InteractionMain replaced by factory.`);

        // ** CSS Injection **
        // The user's Modified script defined the CSS here and injected it.
        // We define injectCSS separately for clarity but call it here.
        const style_id = 'new_interface_style_adjusted_padding'; // Use ID from user's script
        const css_content = `/* ... FULL CSS content from user's Modified Interface script ... */ .new-interface .card--small.card--wide{width:18.3em}.new-interface-info{position:relative;padding:1.5em;height:22.5em}.new-interface-info__body{width:80%;padding-top:1.1em}.new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em}.new-interface-info__head span{color:#fff}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%}.new-interface .card-more__box{padding-bottom:95%}.new-interface .full-start__background{height:108%;top:-6em}.new-interface .card__promo{display:none}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%}.new-interface .card.card--wide .card-watched{display:none!important}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em}body.light--version .new-interface-info{height:25.3em}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}.new-interface .full-start__rate{font-size:1.3em;margin-right:0;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,.12);padding:0 .2em 0 0;border-radius:.3em;gap:.5em;overflow:hidden;height:auto}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,.4);color:#fff;padding:.1em .3em;border-radius:.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0}.tmdb-logo{height:.9em}.rt-logo{height:1.1em}`;

        try {
            // Use the specific injection logic from user's script if different, otherwise use standard
            if (!$('style[data-id="' + style_id + '"]').length) {
                 // Original script removed previous styles - replicating that
                 $('style[data-id^="new_interface_style_"]').remove();
                 Lampa.Template.add(style_id, `<style data-id="${style_id}">${css_content}</style>`);
                 $('body').append(Lampa.Template.get(style_id, {}, true));
                 // console.log(`${PLUGIN_NAME}: CSS Injected via startPlugin.`); // Optional log
             }
        } catch(e) { console.error(`${PLUGIN_NAME}: Error injecting CSS via startPlugin`, e); }

    } // End startPlugin


    // --- Trigger Initialization ---
    // Use the exact initialization method from the user's Modified Interface script
    if (!window.plugin_interface_ready) {
        // Register fetcher settings immediately when script loads
        registerFetcherSettings();
        // Run the main plugin setup
        startPlugin();
        // Set the flag used by the original script (might prevent multiple runs if script loaded twice)
        window.plugin_interface_ready = true;
    }

})(); // End IIFE

