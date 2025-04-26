// == Main Module with IMDB + TMDB + KP Rating Display (Reordered & Showing 0.0) ==
(function () {
    'use strict';

    // --- External Ratings State (GLOBAL within plugin scope) ---
    var externalRatingsCache = {};
    var externalRatingsPending = {};
    // ---------------------------------------------------------


    // --- create function (Info Panel Handler) ---
    function create() {
      var html;
      var timer;
      var network = new Lampa.Reguest();
      var loaded = {};

      this.create = function () {
        // Original 'create' method - UNCHANGED
        html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
      };

      this.update = function (data) {
        // Original 'update' method + fetcher call - UNCHANGED from last step
        var _this = this;
        html.find('.new-interface-info__head,.new-interface-info__details').text('---');
        html.find('.new-interface-info__title').text(data.title);
        html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));
        Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

        if (window.ExternalRatingsFetcher && typeof window.ExternalRatingsFetcher.fetch === 'function' && data.id && !externalRatingsPending[data.id] && !externalRatingsCache[data.id]) {
             externalRatingsPending[data.id] = true;
             window.ExternalRatingsFetcher.fetch(data, function(externalRatingsResult) {
                 externalRatingsCache[data.id] = externalRatingsResult;
                 delete externalRatingsPending[data.id];
                 var tmdb_url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
                 if (loaded[tmdb_url]) {
                     _this.draw(loaded[tmdb_url]);
                 }
             });
        }
        this.load(data);
      };

      this.draw = function (data) {
        // Original 'draw' method variables
        var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
        // Calculate TMDB vote - will default to '0.0' if data.vote_average is missing/0
        var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
        var head = [];
        var details = []; // Original details array
        var countries = Lampa.Api.sources.tmdb.parseCountries(data);
        var pg = Lampa.Api.sources.tmdb.parsePG(data);

        // Original head population
        if (create !== '0000') head.push('<span>' + create + '</span>');
        if (countries.length > 0) head.push(countries.join(', '));

        // --- **MODIFIED RATING DISPLAY LOGIC** ---
        // Get external ratings from cache (might be undefined if fetch not done/failed)
        var external = externalRatingsCache[data.id];

        // 1. IMDB Rating (Always display)
        var imdbRating = external ? parseFloat(external.imdb || 0).toFixed(1) : '0.0';
        details.push('<div class="full-start__rate"><div>' + imdbRating + '</div><div>IMDB</div></div>');

        // 2. TMDB Rating (Always display)
        // 'vote' is already calculated above, defaulting to '0.0'
        details.push('<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>');

        // 3. KP Rating (Always display)
        var kpRating = external ? parseFloat(external.kp || 0).toFixed(1) : '0.0';
        details.push('<div class="full-start__rate"><div>' + kpRating + '</div><div>KP</div></div>');
        // --- **END MODIFIED RATING DISPLAY LOGIC** ---


        // Add other original details (genres, runtime, pg) - UNCHANGED
        if (data.genres && data.genres.length > 0) details.push(data.genres.map(function (item) {
          return Lampa.Utils.capitalizeFirstLetter(item.name);
        }).join(' | '));
        if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
        if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');

        // Original HTML update - UNCHANGED
        html.find('.new-interface-info__head').empty().append(head.join(', '));
        html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
      };

      this.load = function (data) {
        // Original 'load' method - UNCHANGED
        var _this = this;
        clearTimeout(timer);
        var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
        if (loaded[url]) return this.draw(loaded[url]);
        timer = setTimeout(function () {
          network.clear();
          network.timeout(5000);
          network.silent(url, function (movie) {
            loaded[url] = movie;
            _this.draw(movie);
          });
        }, 300);
      };

      // Original 'render', 'empty', 'destroy' methods - UNCHANGED (except destroy clears cache)
      this.render = function () { return html; };
      this.empty = function () {};
      this.destroy = function () {
        html.remove(); loaded = {}; html = null;
        externalRatingsCache = {}; externalRatingsPending = {}; // Keep cache clear
      };
    }


    // --- component function (Main List Handler) ---
    // ORIGINAL FUNCTION - UNCHANGED
    function component(object) {
        // All original variables and methods...
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
        this.empty = function () { /* Original empty code */ var button; if (object.source == 'tmdb') { button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>'); button.find('.selector').on('hover:enter', function () { Lampa.Storage.set('source', 'cub'); Lampa.Activity.replace({ source: 'cub' }); }); } var empty = new Lampa.Empty(); html.append(empty.render(button)); this.start = empty.start; this.activity.loader(false); this.activity.toggle(); };
        this.loadNext = function () { /* Original loadNext code */ var _this = this; if (this.next && !this.next_wait && items.length) { this.next_wait = true; this.next(function (new_data) { _this.next_wait = false; new_data.forEach(_this.append.bind(_this)); Lampa.Layer.visible(items[active + 1].render(true)); }, function () { _this.next_wait = false; }); } };
        this.push = function () {};
        this.build = function (data) { /* Original build code */ var _this2 = this; lezydata = data; info = new create(object); info.create(); scroll.minus(info.render()); data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); html.append(info.render()); html.append(scroll.render()); if (newlampa) { /* Original newlampa code */ Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd = this.loadNext.bind(this); scroll.onWheel = function (step) { if (!Lampa.Controller.own(_this2)) _this2.start(); if (step > 0) _this2.down(); else if (active > 0) _this2.up(); }; } if (items.length > 0 && items[0] && items[0].data) { active = 0; info.update(items[active].data); this.background(items[active].data); } this.activity.loader(false); this.activity.toggle(); };
        this.background = function (elem) { /* Original background code */ if (!elem || !elem.backdrop_path) return; var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); clearTimeout(background_timer); if (new_background == background_last) return; background_timer = setTimeout(function () { background_img.removeClass('loaded'); background_img[0].onload = function () { background_img.addClass('loaded'); }; background_img[0].onerror = function () { background_img.removeClass('loaded'); }; background_last = new_background; setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); }, 1000); };
        this.append = function (element) { /* Original append code */ if (element.ready) return; var _this3 = this; element.ready = true; var item = new Lampa.InteractionLine(element, { url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore }); item.create(); item.onDown = this.down.bind(this); item.onUp = this.up.bind(this); item.onBack = this.back.bind(this); item.onToggle = function () { active = items.indexOf(item); }; if (this.onMore) item.onMore = this.onMore.bind(this); item.onFocus = function (elem) { info.update(elem); _this3.background(elem); }; item.onHover = function (elem) { info.update(elem); _this3.background(elem); }; item.onFocusMore = info.empty.bind(info); scroll.append(item.render()); items.push(item); };
        this.back = function () { Lampa.Activity.backward(); };
        this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); };
        this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } };
        this.start = function () { /* Original start code */ var _this4 = this; Lampa.Controller.add('content', { link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, update: function update() {}, left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, right: function right() { Navigator.move('right'); }, up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, back: this.back }); Lampa.Controller.toggle('content'); };
        this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () { /* Original destroy code */ clearTimeout(background_timer); network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if (info) info.destroy(); /* Calls modified destroy */ if (html) html.remove(); items = null; network = null; lezydata = null; info = null; html = null; };
    }


    // --- Plugin Initialization Logic ---
    // ORIGINAL FUNCTION - UNCHANGED from last step
    function startPlugin() {
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang) {
            console.error("NewInterface Minimal: Missing Lampa components");
            return;
        }
        Lampa.Lang.add({
            full_notext: { en: 'No description', ru: 'Нет описания'},
        });

        window.plugin_interface_ready = true;
        var old_interface = Lampa.InteractionMain;
        var new_interface = component;

        Lampa.InteractionMain = function (object) {
            var use = new_interface;
            if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface;
            if (window.innerWidth < 767) use = old_interface;
            if (!Lampa.Account.hasPremium()) use = old_interface;
            if (Lampa.Manifest.app_digital < 153) use = old_interface;
            return new use(object);
        };

        // Original CSS injection - UNCHANGED
        Lampa.Template.add('new_interface_style', "\n        <style>\n        /* All original CSS from the first script you provided */\n        .new-interface .card--small.card--wide { width: 18.3em; }\n        .new-interface-info { position: relative; padding: 1.5em; height: 24em; }\n        .new-interface-info__body { width: 80%; padding-top: 1.1em; }\n        .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }\n        .new-interface-info__head span { color: #fff; }\n        .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: \".\"; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }\n        .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; }\n        .new-interface-info__split { margin: 0 1em; font-size: 0.7em; }\n        .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: \".\"; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }\n        .new-interface .card-more__box { padding-bottom: 95%; }\n        .new-interface .full-start__background { height: 108%; top: -6em; }\n        .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0; /* Original style */ }\n        .new-interface .card__promo { display: none; }\n        .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }\n        .new-interface .card.card--wide .card-watched { display: none !important; }\n        body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }\n        body.light--version .new-interface-info { height: 25.3em; }\n        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }\n        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }\n        </style>\n    ");
      $('body').append(Lampa.Template.get('new_interface_style', {}, true));
    }

    // Original check before starting - UNCHANGED
    if (!window.plugin_interface_ready) startPlugin();

})();
