// == Lampa Plugin: Interface Patcher - Step 7.1 ==
// Purpose: Test Definitions Only Merge. Defines all functions/vars from
//          both scripts but executes NO initialization logic.
// Strategy: Minimal merge to check for syntax/definition conflicts.
// Version: 7.1 (Definitions Only)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 7.1 (Definitions Only)";

    // --- Lampa Readiness Check ---
    // Basic check - does Lampa global exist? More checks might fail later,
    // but this is just for parsing the definitions.
    if (!window.Lampa) {
        console.error(`${PLUGIN_NAME}: Lampa global object not found.`);
        // Allow script to continue parsing definitions even if Lampa isn't fully ready? Yes.
    } else {
        console.log(`${PLUGIN_NAME}: Lampa object found.`);
    }
    console.log(`${PLUGIN_NAME}: Defining all functions and variables...`);

    // =========================================================================
    // == Embedded MDBList_Fetcher Logic (DEFINITIONS ONLY) ==
    // =========================================================================

    // --- Fetcher Configuration ---
    var fetcher_config = {
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 12 * 1000,
        cache_key: 'mdblist_ratings_cache',
        cache_limit: 500,
        request_timeout: 10000
    };

    // --- Fetcher Language Strings & Settings UI ---
    // Define the registration function BUT DO NOT CALL IT YET
    function registerFetcherSettings() {
        // Ensure flag check is inside if needed later
        if (window.fetcherSettingsRegisteredForMergedDefs) return;
        console.log(`${PLUGIN_NAME}: registerFetcherSettings FUNCTION DEFINED (but not called yet).`);
        try {
            // Add Lang Strings (safe to call Lang.add early if Lampa.Lang exists)
            if (window.Lampa && Lampa.Lang) {
                 Lampa.Lang.add({ mdblist_api_key_desc: { ru: "...", en: "...", uk: "..."} });
                 Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'} });
            } else { console.warn(`${PLUGIN_NAME}: Lampa.Lang not ready for fetcher strings.`);}

            // Add Settings Component/Param (Requires Lampa.SettingsApi)
            if (window.Lampa && Lampa.SettingsApi) {
                Lampa.SettingsApi.addComponent({ component: 'additional_ratings', name: 'Additional Ratings', icon: '<svg><!-- icon --></svg>' });
                Lampa.SettingsApi.addParam({ component: 'additional_ratings', param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' }, field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') || 'Enter API Key' }, onChange: function() { if(Lampa.Settings) Lampa.Settings.update(); } });
                 window.fetcherSettingsRegisteredForMergedDefs = true; // Set flag if registration runs
            } else { console.warn(`${PLUGIN_NAME}: Lampa.SettingsApi not ready for fetcher settings.`); }
        } catch (e) { console.error(`${PLUGIN_NAME}: Error defining fetcher settings registration logic`, e); window.fetcherSettingsRegisteredForMergedDefs = true; } // Set flag even on error
    }
    // ** DO NOT EXECUTE the registration immediately: registerFetcherSettings(); **


    // --- Fetcher Network Instance ---
    // Define but rely on Lampa existing later if used
    var fetcher_network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- Fetcher Caching Functions ---
    function getPersistedCache(tmdb_id) {
        try { if (!window.Lampa || !Lampa.Storage) return false; var t=new Date().getTime(),a=Lampa.Storage.cache(fetcher_config.cache_key,fetcher_config.cache_limit,{});if(a[tmdb_id]){if(t-a[tmdb_id].timestamp>fetcher_config.cache_time)return delete a[tmdb_id],Lampa.Storage.set(fetcher_config.cache_key,a),!1;return a[tmdb_id].data}}catch(e){}return!1;
     }
    function setPersistedCache(tmdb_id, data) {
        try { if (!window.Lampa || !Lampa.Storage) return; var t=new Date().getTime(),a=Lampa.Storage.cache(fetcher_config.cache_key,fetcher_config.cache_limit,{});a[tmdb_id]={timestamp:t,data:data};Lampa.Storage.set(fetcher_config.cache_key,a)}catch(e){}
     }

    // --- Core Fetching Logic Function (Embedded) ---
    function fetchRatings(movieData, callback) {
        if (!fetcher_network) { console.error(`${PLUGIN_NAME}: Fetcher network component unavailable.`); if (callback) callback({ error: "Network component unavailable" }); return; }
        if (!movieData || !movieData.id || !movieData.method || !callback) { if (callback) callback({ error: "Invalid input data" }); return; }
        var tmdb_id = movieData.id; var cached_ratings = getPersistedCache(tmdb_id); if (cached_ratings) { callback(cached_ratings); return; }
        var apiKey = Lampa.Storage.get('mdblist_api_key'); if (!apiKey) { callback({ error: "MDBList API Key not configured" }); return; }
        var media_type = movieData.method === 'tv' ? 'show' : 'movie'; var api_url = `${fetcher_config.api_url}${media_type}/${tmdb_id}?apikey=${apiKey}`;
        fetcher_network.clear(); fetcher_network.timeout(fetcher_config.request_timeout);
        fetcher_network.silent(api_url, function (response) { var r={error:null}; if(response&&response.ratings&&Array.isArray(response.ratings))response.ratings.forEach(t=>{if(t.source&&t.value!==null)r[t.source]=t.value}); else if(response&&response.error)r.error="MDBList API Error: "+response.error; else r.error="Invalid response format"; if (r.error===null||(r.error&&!r.error.toLowerCase().includes("invalid api key")))setPersistedCache(tmdb_id,r); callback(r); }, function (xhr, status) { var e="MDBList request failed"; if(status)e+=` (Status: ${status})`; var r={error:e}; if(status!==401&&status!==403)setPersistedCache(tmdb_id,r); callback(r); });
    }

    // =========================================================================
    // == Enhanced Interface Logic (DEFINITIONS ONLY) ==
    // =========================================================================

    // --- Interface State ---
    let plugin_mdblist_results_cache = {}; // Changed let from var for block scope consistency if needed
    let plugin_mdblist_pending = {};     // Changed let from var

    // --- Interface Logo URLs ---
    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';

    // --- Info Panel Constructor Definition ---
    function EnhancedInfoPanel() {
      var html; var timer; var network = new Lampa.Reguest(); var loaded = {};
      this.html = html; this.timer = timer; this.network = network; this.loaded = loaded;
      // create method defined within constructor scope
      this.create = function () { /* ... html creation ... */ html = $("<div class=\"new-interface-info\"><div class=\"new-interface-info__body\"><div class=\"new-interface-info__head\"></div><div class=\"new-interface-info__title\"></div><div class=\"new-interface-info__details\"></div><div class=\"new-interface-info__description\"></div></div></div>"); this.html = html; };
      // update method defined within constructor scope (calls global fetchRatings)
      this.update = function (data) { /* ... update logic calling fetchRatings(...) ... */ var t=this; try{t.html.find(".new-interface-info__head,.new-interface-info__details").text("---");t.html.find(".new-interface-info__title").text(data.title);t.html.find(".new-interface-info__description").text(data.overview||Lampa.Lang.translate("full_notext"));Lampa.Background.change(Lampa.Api.img(data.backdrop_path,"w200"));delete plugin_mdblist_results_cache[data.id];delete plugin_mdblist_pending[data.id];if(data.id&&data.method){plugin_mdblist_pending[data.id]=!0;const a={id:data.id,method:data.method};fetchRatings(a,function(e){plugin_mdblist_results_cache[data.id]=e;delete plugin_mdblist_pending[data.id];var a=Lampa.TMDB.api((data.name?"tv":"movie")+"/"+data.id+"?api_key="+Lampa.TMDB.key()+"&append_to_response=content_ratings,release_dates&language="+Lampa.Storage.get("language"));if(t&&t.loaded&&t.loaded[a]&&typeof t.draw=="function")t.draw(t.loaded[a])})} if(typeof t.load=="function")t.load(data);else console.error(`${PLUGIN_NAME}: this.load missing.`)}catch(e){console.error(`${PLUGIN_NAME}: Err update`,e)} };
      // draw method defined within constructor scope
      this.draw = function (data) { /* ... draw logic using plugin_mdblist_results_cache ... */ var t=this; try{var a=((data.release_date||data.first_air_date||"0000")+"").slice(0,4),o=parseFloat((data.vote_average||0)+"").toFixed(1),i=[],n=[],r=Lampa.Api.sources.tmdb.parseCountries(data),l=Lampa.Api.sources.tmdb.parsePG(data);if(a!=="0000")i.push("<span>"+a+"</span>");if(r.length>0)i.push(r.join(", "));var s=plugin_mdblist_results_cache[data.id],c="---",p="--%",u="";if(s){if(s.error===null){if(s.imdb!==void 0&&s.imdb!==null&&typeof s.imdb=="number")c=parseFloat(s.imdb).toFixed(1);if(s.tomatoes!==void 0&&s.tomatoes!==null&&typeof s.tomatoes=="number"){var d=s.tomatoes;u=d>=60?rtFreshLogoUrl:d>=0?rtRottenLogoUrl:"";p=d>=0?d+"%":"N/A"}}else c="ERR"}else if(plugin_mdblist_pending[data.id]){c="...";p="...";u=rtFreshLogoUrl} n.push('<div class="full-start__rate imdb-rating-item"><div>'+c+'</div><img src="'+imdbLogoUrl+'" class="rating-logo imdb-logo" alt="IMDB" draggable="false"></div>');n.push('<div class="full-start__rate tmdb-rating-item"><div>'+o+'</div><img src="'+tmdbLogoUrl+'" class="rating-logo tmdb-logo" alt="TMDB" draggable="false"></div>');if(u||plugin_mdblist_pending[data.id]&&p==="..."){if(plugin_mdblist_pending[data.id]&&p==="...")u=rtFreshLogoUrl;n.push('<div class="full-start__rate rt-rating-item"><div class="rt-score">'+p+"</div>"+(u?'<img src="'+u+'" class="rating-logo rt-logo" alt="RT Status" draggable="false">':"")+"</div>")} if(data.genres&&data.genres.length>0)n.push(data.genres.map(e=>Lampa.Utils.capitalizeFirstLetter(e.name)).join(" | "));if(data.runtime)n.push(Lampa.Utils.secondsToTime(data.runtime*60,!0));if(l)n.push('<span class="full-start__pg" style="font-size: 0.9em;">'+l+"</span>");t.html.find(".new-interface-info__head").empty().append(i.join(", "));t.html.find(".new-interface-info__details").empty().html(n.join('<span class="new-interface-info__split">&#9679;</span>'))}catch(e){console.error(`${PLUGIN_NAME}: Err draw`,e)} };
      // load method defined within constructor scope
      this.load = function (data) { /* ... load logic ... */ var t=this; try{clearTimeout(t.timer);var a=Lampa.TMDB.api((data.name?"tv":"movie")+"/"+data.id+"?api_key="+Lampa.TMDB.key()+"&append_to_response=content_ratings,release_dates&language="+Lampa.Storage.get("language"));if(t.loaded&&t.loaded[a]){if(!t.loaded[a].method)t.loaded[a].method=data.name?"tv":"movie";return t.draw(t.loaded[a])} if(!t.network)t.network=new Lampa.Reguest;t.timer=setTimeout(function(){if(!t.network||!t.loaded||!t.draw)return;t.network.clear();t.network.timeout(5e3);t.network.silent(a,function(e){if(!t.loaded||!t.draw)return;t.loaded[a]=e;if(!e.method)e.method=data.name?"tv":"movie";t.draw(e)})},300)}catch(e){console.error(`${PLUGIN_NAME}: Err load`,e)} };
      // render method defined within constructor scope
      this.render = function () { return this.html; };
      // empty method defined within constructor scope
      this.empty = function () {};
      // destroy method defined within constructor scope
      this.destroy = function () { /* ... destroy logic clearing plugin cache ... */ var t=this; try{if(t.html)t.html.remove();if(t.network)t.network.clear();clearTimeout(t.timer);t.loaded={};t.html=null;t.network=null;t.timer=null;plugin_mdblist_results_cache={};plugin_mdblist_pending={}}catch(e){console.error(`${PLUGIN_NAME}: Err info destroy`,e)} };
    }

    // --- Main Component Constructor Definition ---
    function EnhancedComponent(object) {
        // Define all internal vars and methods exactly as in Modified Interface script...
        var network = new Lampa.Reguest(); var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); var items = []; var html = $('<div class="new-interface"><img class="full-start__background"></div>'); var active = 0; var newlampa = Lampa.Manifest.app_digital >= 166; var info; var lazydata; var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; var background_img = html.find('.full-start__background'); var background_last = ''; var background_timer;
        this.network = network; this.scroll = scroll; this.items = items; this.html = html; this.active = active; this.newlampa = newlampa; this.lazydata = lazydata; this.viewall = viewall; this.background_img = background_img; this.background_last = background_last; this.background_timer = background_timer; this.object = object; this.info = info;
        this.create = EnhancedInfoPanel; // Use the info panel constructor defined above
        this.createOnInit = function() {}; // If needed
        this.empty = function () { /* ... empty logic ... */ var t; if(this.object.source=="tmdb"){t=$('<div class="empty__footer"><div class="simple-button selector">'+Lampa.Lang.translate("change_source_on_cub")+"</div></div>");t.find(".selector").on("hover:enter",function(){Lampa.Storage.set("source","cub");Lampa.Activity.replace({source:"cub"})})} var a=new Lampa.Empty;this.html.append(a.render(t));this.start=a.start;if(this.activity){this.activity.loader(!1);this.activity.toggle()} };
        this.loadNext = function () { /* ... loadNext logic ... */ var t=this; if(t.next&&!t.next_wait&&t.items.length){t.next_wait=!0;t.next(function(e){t.next_wait=!1;e.forEach(t.append.bind(t));if(t.items[t.active+1])Lampa.Layer.visible(t.items[t.active+1].render(!0))},function(){t.next_wait=!1})} };
        this.push = function () {};
        this.build = function (data) { /* ... build logic using this.create ... */ var t=this; try{t.lazydata=data;if(typeof t.create=="function"){t.info=new t.create(t.object);t.info.create()}else{console.error(`${PLUGIN_NAME}: create fn missing`);t.info=null} if(t.info)t.scroll.minus(t.info.render());data.slice(0,t.viewall?data.length:2).forEach(t.append.bind(t));if(t.info)t.html.append(t.info.render());t.html.append(t.scroll.render());if(t.newlampa){Lampa.Layer.update(t.html);Lampa.Layer.visible(t.scroll.render(!0));t.scroll.onEnd=t.loadNext.bind(t);t.scroll.onWheel=function(e){if(!Lampa.Controller.own(t))t.start();if(e>0)t.down();else if(t.active>0)t.up()}} if(t.items.length>0&&t.items[0]&&t.items[0].data&&t.info){t.active=0;if(!t.items[0].data.method)t.items[0].data.method=t.items[0].data.name?"tv":"movie";t.info.update(t.items[0].data);t.background(t.items[0].data)} if(t.activity&&typeof t.activity.loader=="function"){t.activity.loader(!1);t.activity.toggle()}else console.warn(`${PLUGIN_NAME}: activity missing in build.`)}catch(e){console.error(`${PLUGIN_NAME}: Err build`,e)} };
        this.background = function (elem) { /* ... background logic ... */ var t=this; try{if(!elem||!elem.backdrop_path)return;var a=Lampa.Api.img(elem.backdrop_path,"w1280");clearTimeout(t.background_timer);if(a==t.background_last)return;if(!t.background_img||!t.background_img.length){t.background_img=t.html.find(".full-start__background");if(!t.background_img.length)return} t.background_timer=setTimeout(function(){if(!t.background_img||!t.background_img.length)return;t.background_img.removeClass("loaded");if(t.background_img[0]){t.background_img[0].onload=()=>{if(t.background_img)t.background_img.addClass("loaded")};t.background_img[0].onerror=()=>{if(t.background_img)t.background_img.removeClass("loaded")};t.background_last=a;setTimeout(()=>{if(t.background_img&&t.background_img[0])t.background_img[0].src=t.background_last},300)}}.bind(t),1e3)}catch(e){console.error(`${PLUGIN_NAME}: Err background`,e)} };
        this.append = function (element) { /* ... append logic ... */ var t=this; try{if(element.ready)return;element.ready=!0;var a=new Lampa.InteractionLine(element,{url:element.url,card_small:!0,cardClass:element.cardClass,genres:t.object.genres,object:t.object,card_wide:!0,nomore:element.nomore});a.create();a.onDown=t.down.bind(t);a.onUp=t.up.bind(t);a.onBack=t.back.bind(t);a.onToggle=function(){t.active=t.items.indexOf(a)};if(t.onMore)a.onMore=t.onMore.bind(t);a.onFocus=function(e){if(!e.method)e.method=e.name?"tv":"movie";if(t.info)t.info.update(e);t.background(e)};a.onHover=function(e){if(!e.method)e.method=e.name?"tv":"movie";if(t.info)t.info.update(e);t.background(e)};if(t.info&&typeof t.info.empty=="function")a.onFocusMore=t.info.empty.bind(t.info);t.scroll.append(a.render());t.items.push(a)}catch(e){console.error(`${PLUGIN_NAME}: Err append`,e)} };
        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () { /* ... down logic ... */ this.active++; this.active = Math.min(this.active, this.items.length - 1); if (!this.viewall && this.lazydata) this.lazydata.slice(0, this.active + 2).forEach(this.append.bind(this)); if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } };
        this.up = function () { /* ... up logic ... */ this.active--; if (this.active < 0) { this.active = 0; Lampa.Controller.toggle('head'); } else { if(this.items[this.active]){ this.items[this.active].toggle(); this.scroll.update(this.items[this.active].render()); } } };
        this.start = function () { /* ... start logic ... */ var t=this; Lampa.Controller.add("content",{link:t,toggle:function(){if(t.activity&&t.activity.canRefresh())return!1;if(t.items.length&&t.items[t.active])t.items[t.active].toggle()},update:function(){},left:function(){if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:function(){Navigator.move("right")},up:function(){if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:function(){if(Navigator.canmove("down"))Navigator.move("down")},back:t.back}); Lampa.Controller.toggle("content") };
        this.refresh = function () { if(this.activity){ this.activity.loader(true); this.activity.need_refresh = true; } };
        this.pause = function () {}; this.stop = function () {};
        this.render = function () { return this.html; };
        this.destroy = function () { /* ... destroy logic ... */ var t=this; try{clearTimeout(t.background_timer);if(t.network)t.network.clear();if(Array.isArray(t.items))Lampa.Arrays.destroy(t.items);if(t.scroll)t.scroll.destroy();if(t.info)t.info.destroy();if(t.html)t.html.remove();t.items=null;t.network=null;t.lazydata=null;t.info=null;t.html=null;t.background_timer=null;t.scroll=null;t.background_img=null;t.object=null;t.activity=null}catch(e){console.error(`${PLUGIN_NAME}: Err destroy`,e)} };
    }

    // --- CSS Injection Function Definition ---
    function injectCSS() {
         // Using same STYLE_ID as defined in startPlugin from user's Modified script
         const style_id = 'new_interface_style_adjusted_padding';
         // console.log(`${PLUGIN_NAME}: Attempting CSS injection (Style ID: ${style_id})...`);
         try {
             // Don't remove other styles, just check if this specific one exists
             if ($('style[data-id="' + style_id + '"]').length) { return; }
             const css = `
             <style data-id="${style_id}">
                 /* ... FULL CSS content from user's Modified Interface script ... */
                 .new-interface .card--small.card--wide { width: 18.3em; } .new-interface-info { position: relative; padding: 1.5em; height: 22.5em; } .new-interface-info__body { width: 80%; padding-top: 1.1em; } .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; } .new-interface-info__head span { color: #fff; } .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; } .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; gap: 0.5em 0; } .new-interface-info__split { margin: 0 1em; font-size: 0.7em; display: inline-block; vertical-align: middle;} .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; } .new-interface .card-more__box { padding-bottom: 95%; } .new-interface .full-start__background { height: 108%; top: -6em; } .new-interface .card__promo { display: none; } .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; } .new-interface .card.card--wide .card-watched { display: none !important; } body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; } body.light--version .new-interface-info { height: 25.3em; } body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; } body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; } .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.5em; overflow: hidden; height: auto; } .new-interface .full-start__rate > div { font-weight: normal; font-size: 1em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0.1em 0.3em; border-radius: 0.3em; line-height: 1.3; order: 1; display: flex; align-items: center; flex-shrink: 0; } .rt-rating-item > div.rt-score { padding-left: 1.2em; padding-right: 1.2em; } .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; flex-shrink: 0; } .tmdb-logo { height: 0.9em; } .rt-logo { height: 1.1em; }
             </style>
             `;
             Lampa.Template.add(style_id, css); // Use the ID from the original script
             $('body').append(Lampa.Template.get(style_id, {}, true));
             // console.log(`${PLUGIN_NAME}: CSS Injected successfully.`); // Optional log
         } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }


    // --- Plugin Initialization Logic (Copied from Modified Interface script's startPlugin) ---
    function startPlugin() {
        // console.log(`${PLUGIN_NAME}: startPlugin() called.`); // Optional log
        // Readiness check from original startPlugin
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller || !Lampa.Account || !Lampa.Manifest) {
             console.error(`${PLUGIN_NAME}: Missing Lampa components in startPlugin.`); return;
        }

        // Add Lang string if needed (already done by fetcher part, but safe to double-check)
        if (!Lampa.Lang.exist('full_notext')) { Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'} }); }

        // Don't set global flag window.plugin_interface_ready = true; // Not needed

        var old_interface = Lampa.InteractionMain; // Capture Lampa's default factory
        var new_interface = component; // Use the 'component' function (EnhancedComponent) defined above

        // Replace Lampa.InteractionMain with the conditional factory logic from Modified script
        Lampa.InteractionMain = function (object) {
            // console.log(`${PLUGIN_NAME}: Factory function running for source:`, object?.source); // Optional log
            var use_interface_constructor = new_interface; // Default to our enhanced one
            var use_fallback = false; // Flag for logging

            // Conditions copied exactly from user's Modified script
            if (!(object.source == 'tmdb' || object.source == 'cub')) { use_interface_constructor = old_interface; use_fallback = true; }
            if (window.innerWidth < 767) { use_interface_constructor = old_interface; use_fallback = true; }
            if (!Lampa.Account.hasPremium()) { use_interface_constructor = old_interface; use_fallback = true; }
            if (Lampa.Manifest.app_digital < 153) { use_interface_constructor = old_interface; use_fallback = true; }

            // console.log(`${PLUGIN_NAME}: Using ${use_fallback ? 'Original/Default' : 'Enhanced'} component.`); // Optional log

            // Instantiate the chosen component constructor
            try {
                 // Ensure the chosen constructor is valid before using 'new'
                 if (typeof use_interface_constructor === 'function') {
                     // Use 'new' as in the original script's factory
                     return new use_interface_constructor(object);
                 } else {
                      console.error(`${PLUGIN_NAME}: Chosen interface constructor is not a function! Falling back.`);
                      if (typeof old_interface === 'function') return new old_interface(object);
                      else return null;
                 }
            } catch (e) {
                 console.error(`${PLUGIN_NAME}: Error instantiating component!`, e);
                 // Fallback safely
                 if (typeof old_interface === 'function') {
                      try { return new old_interface(object); } catch(fe) { return null;}
                 } else { return null; }
            }
        };
         console.log(`${PLUGIN_NAME}: Lampa.InteractionMain replaced.`);

        // CSS Injection (call function defined above)
        injectCSS();

        // No need to check window.plugin_interface_ready here as this *is* the init logic
    } // End startPlugin


    // --- Trigger Initialization ---
    // Use Lampa listener to call startPlugin after Lampa is ready
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received. Running startPlugin...`);
            // Register Fetcher settings before running main plugin logic
            registerFetcherSettings();
            // Run the main initialization function
            startPlugin();
            console.log(`${PLUGIN_NAME}: Initialization sequence complete.`);
        }
    });

})(); // End IIFE
