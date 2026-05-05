// == Lampa MDBList Phase 7 (The Polished Milestone) ==
(function () {
    'use strict';

    // --- 1. Global CSS Injection for Grid & Full Card Rating Badges ---
    if (!$('style[data-id="mdblist_homepage_cards"]').length) {
        $('head').append(`
        <style data-id="mdblist_homepage_cards">
            /* Hide Lampa's native rating badge on the wide grid */
            .card--wide .card__vote { display: none !important; }
            
            /* Push text/logo up further to prevent overlap with bottom ratings */
            .card--wide .card__promo { padding-bottom: 2.6em !important; }

            /* Make the custom metadata text smaller and dimmer */
            .card--wide .card__promo-text { 
            font-size: 0.85em !important; 
            color: rgba(255, 255, 255, 0.7) !important; }
            
            /* Container for Grid */
            .mdblist-ratings-wrapper { position: absolute; bottom: 0.5em; right: 1.5em !important; display: flex; flex-direction: row; flex-wrap: wrap; justify-content: flex-end; gap: 0.3em; z-index: 10; align-items: center; }
            
            /* Container for Full Page (Inside Card) */
            .full-mdblist-ratings { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.3em; margin-top: 0.5em; margin-bottom: 0.5em; }

            /* Squeezed paddings/fonts so all 8 fit on one line */
            .mdblist-ratings-wrapper .full-start__rate, .full-mdblist-ratings .full-start__rate { font-size: 1.25em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.1em 0 0; border-radius: 0.3em; gap: 0.15em; overflow: hidden; height: auto; margin-right: 0; }
            .mdblist-ratings-wrapper .full-start__rate > div, .full-mdblist-ratings .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
            .mdblist-ratings-wrapper .rating-logo, .full-mdblist-ratings .rating-logo { height: 1.0em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
            .mdblist-ratings-wrapper .tmdb-logo, .full-mdblist-ratings .tmdb-logo { height: 0.85em; }
            .mdblist-ratings-wrapper .rt-logo, .full-mdblist-ratings .rt-logo { height: 1.0em; }
        </style>
        `);
    }
        // --- GLOBAL DISCOVER STATE ---
        var DiscoverState = {
            types: ['movie'], 
            providers: ['imdb'], 
            score_min: 70,
            score_max: 100,
            genres: [],
            year_min: 2000,
            year_max: 2026
        };


    // --- 2. Master Script Configuration ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', 
        cache_time: 60 * 60 * 12 * 1000, 
        cache_key: 'mdblist_ratings_cache', 
        cache_limit: 500, 
        request_timeout: 10000 
    };

    var mdblistRatingsCache = {};
    var mdblistRatingsPending = {};
    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null; 

    const imdbLogoUrl = 'https://psahx.github.io/ps_plug/IMDb_3_2_Logo_GOLD.png';
    const tmdbLogoUrl = 'https://psahx.github.io/ps_plug/TMDB.svg';
    const rtFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes.svg';
    const rtRottenLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_rotten.svg';
    const rtAudienceFreshLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_positive_audience.svg';
    const rtAudienceSpilledLogoUrl = 'https://psahx.github.io/ps_plug/Rotten_Tomatoes_negative_audience.svg';
    const metacriticLogoUrl = 'https://psahx.github.io/ps_plug/Metacritic_M.png';
    const traktLogoUrl = 'https://psahx.github.io/ps_plug/Trakt.svg';
    const letterboxdLogoUrl = 'https://psahx.github.io/ps_plug/letterboxd-decal-dots-pos-rgb.svg';
    const rogerEbertLogoUrl = 'https://psahx.github.io/ps_plug/Roger_Ebert.jpeg';

    // --- 3. Language Strings ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: { ru: "Введите ваш API ключ с сайта MDBList.com", en: "Enter your API key from MDBList.com", uk: "Введіть ваш API ключ з сайту MDBList.com" },
            additional_ratings_title: { ru: "Дополнительные Рейтинги", en: "Additional Ratings", uk: "Додаткові Рейтинги" },
            select_ratings_button_name: { en: "Select Rating Providers", ru: "Выбрать Источники Рейтингов", uk: "Обрати Джерела Рейтингів" },
            select_ratings_button_desc: { en: "Choose which ratings to display", ru: "Выберите, какие рейтинги отображать", uk: "Оберіть, які рейтинги відображати" },
            select_ratings_dialog_title: { en: "Select Ratings", ru: "Выбор Рейтингов", uk: "Вибір Рейтингів" },
            logo_toggle_name: { ru: "Логотип вместо заголовка", en: "Logo Instead of Title", uk: "Логотип замість заголовка" },
            logo_toggle_desc: { ru: "Заменяет текстовый заголовок фильма логотипом", en: "Replaces movie text title with a logo", uk: "Замінює текстовий заголовок логотипом" },
            settings_show: { ru: "Показать", en: "Show", uk: "Показати" },
            settings_hide: { ru: "Скрыть", en: "Hide", uk: "Приховати" },
            full_notext: { en: 'No description', ru: 'Нет описания', uk: 'Немає опису' },
            info_panel_logo_height_name: { ru: "Размер логотипа", en: "Logo Size", uk: "Висота логотипу" },
            info_panel_logo_height_desc: { ru: "Максимальная высота логотипа", en: "Maximum logo height", uk: "Максимальна высота логотипу" },
            discover_toggle_name: {ru: 'Показывать меню Открытие', en: 'Show Discover Menu'},
            discover_toggle_desc: {ru: 'Отображать пункт MDBList в боковом меню', en: 'Display the MDBList item in the side menu'},
            title_discover: {ru: 'Открытие', en: 'Discover'},
            title_type: {ru: 'Тип контента', en: 'Media Type'},
            title_provider: {ru: 'Провайдер', en: 'Provider'},
            title_min_score: {ru: 'Мин. рейтинг', en: 'Min Score'},
            title_max_score: {ru: 'Макс. рейтинг', en: 'Max Score'},
            title_year_min: {ru: 'Год от', en: 'Year From'},
            title_year_max: {ru: 'Год до', en: 'Year To'},
            title_generate: {ru: 'Создать каталог', en: 'Generate Catalog'}

        });
    }

    // --- 4. STRICT Master Settings UI ---
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'mdblist_api_key', type: 'input', 'default': '', values: {}, placeholder: 'Enter your MDBList API Key' },
            field: { name: 'MDBList API Key', description: Lampa.Lang.translate('mdblist_api_key_desc') },
            onChange: function() { Lampa.Settings.update(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'select_ratings_button', type: 'button' },
            field: { name: Lampa.Lang.translate('select_ratings_button_name'), description: Lampa.Lang.translate('select_ratings_button_desc') },
            onChange: function () { showRatingProviderSelection(); }
        });
                
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',        
            param: { name: 'show_logo_instead_of_title', type: 'select', values: { 'true': Lampa.Lang.translate('settings_show'), 'false': Lampa.Lang.translate('settings_hide') }, 'default': 'false' },
            field: { name: Lampa.Lang.translate('logo_toggle_name'), description: Lampa.Lang.translate('logo_toggle_desc') },
            onChange: function(value) { Lampa.Storage.set('show_logo_instead_of_title', value); }
        });
                
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: {
                name: 'info_panel_logo_max_height', type: 'select',
                values: { '50': '50px', '75': '75px', '100': '100px', '125': '125px', '150': '150px', '175': '175px', '200': '200px', '225': '225px', '250': '250px', '300': '300px', '350': '350px', '400': '400px', '450': '450px', '500': '500px' },
                'default': '100'
            },
            field: { name: Lampa.Lang.translate('info_panel_logo_height_name'), description: Lampa.Lang.translate('info_panel_logo_height_desc') },
            onChange: function(value) { Lampa.Storage.set('info_panel_logo_max_height', value); }
        });
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: { name: 'show_mdblist_discover', type: 'select', values: { 'true': Lampa.Lang.translate('settings_show'), 'false': Lampa.Lang.translate('settings_hide') }, 'default': 'true' },
            field: { name: Lampa.Lang.translate('discover_toggle_name'), description: Lampa.Lang.translate('discover_toggle_desc') },
            onChange: function(value) { 
                Lampa.Storage.set('show_mdblist_discover', value); 
                if (value === 'true' || value === true) { if (typeof injectDiscoverMenu === 'function') injectDiscoverMenu(); } 
                else { $('.menu__item[data-action="mdblist_discover"]').remove(); }
            }
        });


    }


    // --- 4.5. STRICT Left Menu Injection ---
    function injectDiscoverMenu() {
        if (!window.Lampa) return;
        var checkMenu = setInterval(function() {
            var menuList = $('.menu .menu__list');
            if (menuList.length) {
                clearInterval(checkMenu);
                if (Lampa.Storage.get('show_mdblist_discover', 'true') === 'true' || Lampa.Storage.get('show_mdblist_discover', true) === true) {
                    if (!$('.menu__item[data-action="mdblist_discover"]').length) {
                        var discoverBtn = $('<li class="menu__item selector" data-action="mdblist_discover"><div class="menu__ico"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div><div class="menu__text">' + Lampa.Lang.translate('title_discover') + '</div></li>');
                        discoverBtn.on('hover:enter', function() { showMDBListDiscoverMenu(); });
                        menuList.append(discoverBtn);
                    }
                }
            }
        }, 500);
    }

    // --- 5. STRICT Rating Selection Dialog ---
    function showRatingProviderSelection() {
        const providers = [
            { title: 'IMDb', id: 'show_rating_imdb', default: true },
            { title: 'TMDB', id: 'show_rating_tmdb', default: true },
            { title: 'Rotten Tomatoes (Critics)', id: 'show_rating_tomatoes', default: false },
            { title: 'Rotten Tomatoes (Audience)', id: 'show_rating_audience', default: false },
            { title: 'Metacritic', id: 'show_rating_metacritic', default: false },
            { title: 'Trakt', id: 'show_rating_trakt', default: false },
            { title: 'Letterboxd', id: 'show_rating_letterboxd', default: false },
            { title: 'Roger Ebert', id: 'show_rating_rogerebert', default: false }
        ];

        let selectItems = providers.map(provider => {
            let storedValue = Lampa.Storage.get(provider.id, provider.default);
            let isChecked = (storedValue === true || storedValue === 'true');
            return { title: provider.title, id: provider.id, checkbox: true, checked: isChecked, default: provider.default };
        });

        var currentController = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), 
            items: selectItems,                                        
            onBack: function () { Lampa.Controller.toggle(currentController || 'settings'); },
            onCheck: function (item) { 
                let oldValue = Lampa.Storage.get(item.id, item.default);
                let oldStateIsChecked = (oldValue === true || oldValue === 'true');
                let newStateIsChecked = !oldStateIsChecked;
                Lampa.Storage.set(item.id, newStateIsChecked);
                item.checked = newStateIsChecked;
            }
        });
    }

    // --- 6. Caching & Fetching Functions ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); 
        if (cache[tmdb_id]) {
            if ((new Date().getTime() - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id]; Lampa.Storage.set(config.cache_key, cache); return false;
            } 
          return cache[tmdb_id].data; 
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return;
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        cache[tmdb_id] = { timestamp: new Date().getTime(), data: data };
        Lampa.Storage.set(config.cache_key, cache); 
    }

    function fetchRatings(movieData, callback) {
        var localNet = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;
        if (!localNet || !movieData || !movieData.id || !callback) return;

        var cached_ratings = getCache(movieData.id);
        if (cached_ratings) { callback(cached_ratings); return; }

        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) { callback({ error: "MDBList API Key not configured" }); return; }

        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(movieData.id, "?apikey=").concat(apiKey);
        
        localNet.timeout(config.request_timeout);
        localNet.silent(api_url, function (response) {
            var ratingsResult = { error: null }; 
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) {
                     if (rating.source && rating.value !== null) { ratingsResult[rating.source] = rating.value; }
                 });
            } else if (response && response.error) { ratingsResult.error = "MDBList API Error: " + response.error; } 
            else { ratingsResult.error = "Invalid response format"; }
            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) { setCache(movieData.id, ratingsResult); }
            callback(ratingsResult);
        }, function (xhr, status) {
            var errorResult = { error: "MDBList request failed" };
            if (status !== 401 && status !== 403) { setCache(movieData.id, errorResult); }
            callback(errorResult);
        }); 
    }

    // --- HTML Array Builder (Keeps code clean across Grid & Full page) ---
    function buildRatingsHtmlArray(ratings, vote) {
        var arr = [];
        let showImdb = Lampa.Storage.get('show_rating_imdb', true) === true || Lampa.Storage.get('show_rating_imdb', true) === 'true';
        let showTmdb = Lampa.Storage.get('show_rating_tmdb', true) === true || Lampa.Storage.get('show_rating_tmdb', true) === 'true';
        let showTomatoes = Lampa.Storage.get('show_rating_tomatoes', false) === true || Lampa.Storage.get('show_rating_tomatoes', false) === 'true';
        let showAudience = Lampa.Storage.get('show_rating_audience', false) === true || Lampa.Storage.get('show_rating_audience', false) === 'true';
        let showMetacritic = Lampa.Storage.get('show_rating_metacritic', false) === true || Lampa.Storage.get('show_rating_metacritic', false) === 'true';
        let showTrakt = Lampa.Storage.get('show_rating_trakt', false) === true || Lampa.Storage.get('show_rating_trakt', false) === 'true';
        let showLetterboxd = Lampa.Storage.get('show_rating_letterboxd', false) === true || Lampa.Storage.get('show_rating_letterboxd', false) === 'true';
        let showRogerebert = Lampa.Storage.get('show_rating_rogerebert', false) === true || Lampa.Storage.get('show_rating_rogerebert', false) === 'true';

        if (showImdb) { arr.push('<div class="full-start__rate"><div>' + (ratings && ratings.imdb !== null && typeof ratings.imdb === 'number' ? parseFloat(ratings.imdb || 0).toFixed(1) : '0.0') + '</div><img src="' + imdbLogoUrl + '" class="rating-logo imdb-logo" draggable="false"></div>'); }
        if (showTmdb) { arr.push('<div class="full-start__rate"><div>' + vote + '</div><img src="' + tmdbLogoUrl + '" class="rating-logo tmdb-logo" draggable="false"></div>'); }
        if (showTomatoes && ratings && typeof ratings.tomatoes === 'number' && ratings.tomatoes !== null) { arr.push('<div class="full-start__rate"><div class="rt-score">' + ratings.tomatoes + '</div><img src="' + (ratings.tomatoes >= 60 ? rtFreshLogoUrl : rtRottenLogoUrl) + '" class="rating-logo rt-logo" draggable="false"></div>');  }
        if (showAudience && ratings && ratings.popcorn != null && !isNaN(parseFloat(ratings.popcorn))) { arr.push('<div class="full-start__rate"><div class="rt-audience-score">' + parseFloat(ratings.popcorn) + '</div><img src="' + (parseFloat(ratings.popcorn) >= 60 ? rtAudienceFreshLogoUrl : rtAudienceSpilledLogoUrl) + '" class="rating-logo rt-audience-logo" draggable="false"></div>');  }
        if (showMetacritic && ratings && typeof ratings.metacritic === 'number' && ratings.metacritic !== null) { arr.push('<div class="full-start__rate"><div class="metacritic-score">' + ratings.metacritic + '</div><img src="' + metacriticLogoUrl + '" class="rating-logo metacritic-logo" draggable="false"></div>'); }
        if (showTrakt && ratings && ratings.trakt != null) { arr.push('<div class="full-start__rate"><div class="trakt-score">' + parseFloat(ratings.trakt) + '</div><img src="' + traktLogoUrl + '" class="rating-logo trakt-logo" draggable="false"></div>'); }
        if (showLetterboxd && ratings && ratings.letterboxd != null) { arr.push('<div class="full-start__rate"><div class="letterboxd-score">' + parseFloat(ratings.letterboxd).toFixed(1) + '</div><img src="' + letterboxdLogoUrl + '" class="rating-logo letterboxd-logo" draggable="false"></div>'); }
        if (showRogerebert && ratings && ratings.rogerebert != null) { arr.push('<div class="full-start__rate"><div class="rogerebert-score">' + parseFloat(ratings.rogerebert).toFixed(1) + '</div><img src="' + rogerEbertLogoUrl + '" class="rating-logo rogerebert-logo" draggable="false"></div>'); }

        return arr;
    }

    // --- 7. The Grid Watcher (Wide Cards) ---
    function applyWideDOM() {
        // Global dictionary to hold TMDB's localized genres
        if (!window.mdblist_genres_dict) window.mdblist_genres_dict = {};
        if (!window.mdblist_current_lang) window.mdblist_current_lang = '';

        setInterval(function() {
            var currentLang = Lampa.Storage.get('language') || 'en';
            
            // --- SILENT NETWORK FETCH FOR GENRES ---
            // If language changes, wipe the dictionary and grab the new localized one directly from TMDB
            if (window.mdblist_current_lang !== currentLang) {
                window.mdblist_current_lang = currentLang;
                window.mdblist_genres_dict = {}; // Clear old language
                
                var net = new Lampa.Reguest();
                var apiKey = Lampa.TMDB.key();
                
                net.silent('https://api.themoviedb.org/3/genre/movie/list?api_key=' + apiKey + '&language=' + currentLang, function(res) {
                    if (res && res.genres) res.genres.forEach(function(g) { window.mdblist_genres_dict[g.id] = g.name; });
                });
                net.silent('https://api.themoviedb.org/3/genre/tv/list?api_key=' + apiKey + '&language=' + currentLang, function(res) {
                    if (res && res.genres) res.genres.forEach(function(g) { window.mdblist_genres_dict[g.id] = g.name; });
                });
            }

            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:visible').each(function() {
                    var card = $(this);
                    var movie = this.card_data; 
                    if (!movie || !movie.id) return; 

                    // Structural setup (Runs once per card)
                    if (!this.mdblist_structure_applied) {
                        this.mdblist_structure_applied = true;
                        card.addClass('card--wide');
                        var imgElement = card.find('.card__img');
                        var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                        if (targetImage) {
                            imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                            imgElement.css({ 'object-fit': 'cover', 'object-position': 'top' });
                        }
                        card.find('.card__title, .card__age').remove();
                        if (card.find('.card__promo').length === 0) {
                            card.find('.card__view').append('<div class="card__promo"><div class="card__promo-title"></div><div class="card__promo-text"></div></div>');
                        }
                    }

                    var currentPromoBox = card.find('.card__promo');
                    var titleText = movie.title || movie.name || "Unknown";
                    
                    // --- THE NEW METADATA STRING (Dynamically built, no locking!) ---
                    var year = (movie.release_date || movie.first_air_date || "").substring(0, 4);
                    var langCode = (movie.original_language || "").toUpperCase();
                    var genreNames = [];
                    
                    if (movie.genre_ids && movie.genre_ids.length > 0) {
                        movie.genre_ids.slice(0, 3).forEach(function(id) { 
                            var gName = window.mdblist_genres_dict[id];
                            if (gName) genreNames.push(gName.charAt(0).toUpperCase() + gName.slice(1));
                        });
                    }
                    var genresString = genreNames.join(' | ');

                    var metaParts = [];
                    if (year) metaParts.push(year);
                    if (langCode) metaParts.push(langCode);
                    if (genresString) metaParts.push(genresString);
                    
                    var customMetadata = metaParts.join('  •  ');
                    if (!customMetadata) customMetadata = Lampa.Lang.translate('full_notext') || "";

                    // Update the text safely
                    if (currentPromoBox.find('.card__promo-text').text() !== customMetadata) {
                        currentPromoBox.find('.card__promo-text').text(customMetadata);
                    }
                    
                    // --- LOGO LOGIC (Now detects language changes!) ---
                    var showLogos = Lampa.Storage.get('show_logo_instead_of_title', 'false') === 'true' || Lampa.Storage.get('show_logo_instead_of_title', false) === true;
                    
                    if (showLogos && (!this.logo_fetched || this.logo_lang !== currentLang)) {
                        this.logo_fetched = true;
                        this.logo_lang = currentLang; // Lock logo to current language
                        
                        var logoNet = new Lampa.Reguest();
                        var apiUrl = Lampa.TMDB.api(((movie.method || (movie.name ? 'tv' : 'movie')) === 'tv' ? 'tv/' : 'movie/') + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + currentLang + '&include_image_language=' + currentLang + ',en,null');
                        
                            logoNet.silent(apiUrl, function(res) {
                            var logoPath = null;
                            if (res && res.logos && res.logos.length > 0) {
                                // 1. Isolate logos that exactly match your current language
                                var langLogos = res.logos.filter(l => l.iso_639_1 === currentLang);
                                
                                // 2. If none exist, fall back to the whole list (English/Null)
                                if (langLogos.length === 0) langLogos = res.logos; 
                                
                                // 3. Grab a PNG from that specific language group, or accept the SVG if it's the only one
                                var bestLogo = langLogos.find(l => l.file_path && !l.file_path.endsWith('.svg')) || langLogos[0];
                                logoPath = bestLogo.file_path;
                            }

                            if (logoPath) {
                                var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '100');
                                if (!/^\d+$/.test(selectedHeight)) selectedHeight = '100';
                                var styleAttr = `max-height: ${selectedHeight}px; max-width: 50%; vertical-align: middle; margin-bottom: 0.1em;`;
                                currentPromoBox.find('.card__promo-title').empty().html(`<img src="${Lampa.TMDB.image('/t/p/original' + logoPath)}" style="${styleAttr}" alt="${titleText} Logo" />`);
                            } else {
                                currentPromoBox.find('.card__promo-title').text(titleText);
                            }
                        });
                    } else if (!showLogos && !this.logo_fetched) {
                        this.logo_fetched = true; 
                        currentPromoBox.find('.card__promo-title').text(titleText);
                    }

                    // --- RATINGS LOGIC ---
                    if (!this.mdblist_fetched) {
                        this.mdblist_fetched = true;
                        fetchRatings({ id: movie.id, method: movie.method || (movie.name ? 'tv' : 'movie') }, function(ratings) {
                            var vote = parseFloat((movie.vote_average || 0) + '').toFixed(1);
                            var lineOneDetails = buildRatingsHtmlArray(ratings, vote);

                            card.find('.mdblist-ratings-wrapper').remove();
                            if (lineOneDetails.length > 0) { 
                                card.find('.card__view').append('<div class="mdblist-ratings-wrapper">' + lineOneDetails.join('') + '</div>'); 
                            }
                        });
                    }
                });
            }
        }, 500); 
    }


    // --- 8. EXACT COPY: Old Plugin Info Panel --- REMOVED - OBSOLETE
    

    // --- 9. EXACT COPY: Old Plugin Grid Replacement (Cleaned of Section 8) ---
    function component(object) { 
        var network = new Lampa.Reguest(); 
        var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true }); 
        var items = []; 
        var html = $('<div class="new-interface"><img class="full-start__background"></div>'); 
        var active = 0; 
        var newlampa = Lampa.Manifest.app_digital >= 166; 
        var lezydata; 
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse'; 
        var background_img = html.find('.full-start__background'); 
        var background_last = ''; 
        var background_timer; 
        
        this.create = function () {}; 
        
        this.empty = function () { 
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
            this.start = empty.start; 
            this.activity.loader(false); 
            this.activity.toggle(); 
        }; 
        
        this.loadNext = function () {
            var _this = this; 
            if (this.next && !this.next_wait && items.length) { 
                this.next_wait = true; 
                this.next(function (new_data) { 
                    _this.next_wait = false; 
                    new_data.forEach(_this.append.bind(_this)); 
                    Lampa.Layer.visible(items[active + 1].render(true)); 
                }, function () { _this.next_wait = false; }); 
            } 
        }; 
        
        this.push = function () {}; 
        
        this.build = function (data) {
            var _this2 = this;
            lezydata = data; 
            data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this)); 
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
            if (items.length > 0 && items[0] && items[0].data) { 
                active = 0; 
                this.background(items[active].data); 
            }    
            this.activity.loader(false); 
            this.activity.toggle(); 
        }; 
        
        this.background = function (elem) {
            if (!elem || !elem.backdrop_path) return; 
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280'); 
            clearTimeout(background_timer); 
            if (new_background == background_last) return; 
            background_timer = setTimeout(function () { 
                background_img.removeClass('loaded'); 
                background_img[0].onload = function () { background_img.addClass('loaded'); }; 
                background_img[0].onerror = function () { background_img.removeClass('loaded'); }; 
                background_last = new_background; 
                setTimeout(function () { if (background_img[0]) background_img[0].src = background_last; }, 300); 
            }, 1000); 
        }; 
        
        this.append = function (element) {
            if (element.ready) return; 
            var _this3 = this; 
            element.ready = true; 
            var item = new Lampa.InteractionLine(element, { 
                url: element.url, card_small: true, cardClass: element.cardClass, genres: object.genres, object: object, card_wide: true, nomore: element.nomore 
            }); 
            item.create(); 
            item.onDown = this.down.bind(this); 
            item.onUp = this.up.bind(this); 
            item.onBack = this.back.bind(this); 
            item.onToggle = function () { active = items.indexOf(item); }; 
            if (this.onMore) item.onMore = this.onMore.bind(this); 
            item.onFocus = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; _this3.background(elem); }; 
            item.onHover = function (elem) { if (!elem.method) elem.method = elem.name ? 'tv' : 'movie'; _this3.background(elem); }; 
            scroll.append(item.render()); 
            items.push(item); 
        }; 
        
        this.back = function () { Lampa.Activity.backward(); }; 
        this.down = function () { active++; active = Math.min(active, items.length - 1); if (!viewall && lezydata) lezydata.slice(0, active + 2).forEach(this.append.bind(this)); items[active].toggle(); scroll.update(items[active].render()); }; 
        this.up = function () { active--; if (active < 0) { active = 0; Lampa.Controller.toggle('head'); } else { items[active].toggle(); scroll.update(items[active].render()); } }; 
        
        this.start = function () {
            var _this4 = this; 
            Lampa.Controller.add('content', { 
                link: this, toggle: function toggle() { if (_this4.activity.canRefresh()) return false; if (items.length) { items[active].toggle(); } }, 
                update: function update() {}, 
                left: function left() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); }, 
                right: function right() { Navigator.move('right'); }, 
                up: function up() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); }, 
                down: function down() { if (Navigator.canmove('down')) Navigator.move('down'); }, 
                back: this.back 
            }); 
            Lampa.Controller.toggle('content'); 
        }; 
        
        this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; }; 
        this.pause = function () {}; 
        this.stop = function () {}; 
        this.render = function () { return html; }; 
        
        this.destroy = function () {
            clearTimeout(background_timer); 
            network.clear(); 
            Lampa.Arrays.destroy(items); 
            scroll.destroy(); 
            if (html) html.remove(); 
            items = null; network = null; lezydata = null; html = null; 
        }; 
    }


    // --- 10. EXACT COPY: Old Plugin Init + TWEAK 3: Full Page Ratings ---
    function startPlugin() {
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang || !Lampa.Storage || !Lampa.TMDB || !Lampa.Template || !Lampa.Reguest || !Lampa.Api || !Lampa.InteractionLine || !Lampa.Scroll || !Lampa.Activity || !Lampa.Controller) { 
            console.error("NewInterface Adjust Padding: Missing Lampa components"); 
            return; 
        }
        
        window.plugin_interface_ready = true; 
        var old_interface = Lampa.InteractionMain; 
        var new_interface = component;
        
        if (Lampa.Listener && network) { 
            Lampa.Listener.follow("full", function(eventData) {
                var storageKey = 'show_logo_instead_of_title';
                try {
                    var showLogos = (Lampa.Storage.get(storageKey, 'false') === 'true' || Lampa.Storage.get(storageKey, false) === true);

                    if (eventData.type === 'complite') {
                        var movie = eventData.data.movie;

                        if (movie && movie.id && movie.title) {
                            movie.method = movie.name ? 'tv' : 'movie'; 
                            var id = movie.id;

                            var initialTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title, .full-start__title");

                            if (initialTargetElement.length > 0) {
                                
                                // TWEAK 3 (PART 1): Inject Logo
                                if (showLogos) {
                                    initialTargetElement.text(movie.title);
                                    var apiKey = Lampa.TMDB.key();
                                    var language = Lampa.Storage.get('language');
                                
                                    // Add the include_image_language fallback to the URL!
                                    var apiUrl = Lampa.TMDB.api((movie.method === 'tv' ? 'tv/' : 'movie/') + id + '/images?api_key=' + apiKey + '&language=' + language + '&include_image_language=' + language + ',en,null');

                                    var masterNet = new Lampa.Reguest();
                                    masterNet.timeout(config.request_timeout || 7000);
                                    masterNet.silent(apiUrl, function (response) { 
                                        var logoPath = null;
                                        if (response && response.logos && response.logos.length > 0) {
                                            // Smart filtering: Look for exact language match first, then fall back
                                            var langLogos = response.logos.filter(l => l.iso_639_1 === language);
                                            if (langLogos.length === 0) langLogos = response.logos; 
                                            
                                            var bestLogo = langLogos.find(l => l.file_path && !l.file_path.endsWith('.svg')) || langLogos[0];
                                            logoPath = bestLogo.file_path;
                                        }


                                        var currentTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title, .full-start__title");

                                        if (currentTargetElement.length > 0) {
                                            if (logoPath) {
                                                var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '60'); 
                                                if (!/^\d+$/.test(selectedHeight)) { selectedHeight = '75'; } 
                                                var styleAttr = `margin-top: 5px; max-height: ${selectedHeight}px; max-width: 100%; vertical-align: middle;`; 
                                                var imgUrl = Lampa.TMDB.image('/t/p/original' + logoPath);
                                                currentTargetElement.empty().html(`<img src="${imgUrl}" style="${styleAttr}" alt="${movie.title} Logo" />`); 
                                            } else {
                                                currentTargetElement.text(movie.title); 
                                            }
                                        }

                                    }, function() { 
                                         var currentTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title, .full-start__title");
                                          if (currentTargetElement && currentTargetElement.length) {
                                              currentTargetElement.text(movie.title);
                                          }
                                    }); 
                                }

                                // TWEAK 3 (PART 2): Inject Ratings under the Title/Logo
                                fetchRatings(movie, function(ratings) {
                                    var vote = parseFloat((movie.vote_average || 0) + '').toFixed(1);
                                    var lineOneDetails = buildRatingsHtmlArray(ratings, vote);

                                    var currentTargetElement = $(eventData.object.activity.render()).find(".full-start-new__title, .full-start__title");
                                    if (currentTargetElement.length > 0) {
                                        currentTargetElement.next('.full-mdblist-ratings').remove();
                                        if (lineOneDetails.length > 0) {
                                            currentTargetElement.after('<div class="full-mdblist-ratings">' + lineOneDetails.join('') + '</div>');
                                        }
                                    }
                                });
                            } 
                        } 
                    } 
                } catch (e) { console.error("Logo Listener (Full): Error in callback:", e); }
            }); 
        } 
    
        Lampa.InteractionMain = function (object) { 
            var use = new_interface; 
            if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_interface; 
            if (window.innerWidth < 767) use = old_interface; 
            if (!Lampa.Account.hasPremium()) use = old_interface; 
            if (Lampa.Manifest.app_digital < 153) use = old_interface; 
            return new use(object); 
        };

        var style_id = 'new_interface_style_adjusted_padding'; 
        if (!$('style[data-id="' + style_id + '"]').length) {
             $('style[data-id^="new_interface_style_"]').remove(); 

            Lampa.Template.add(style_id, `
            <style data-id="${style_id}">
            .new-interface .card--small.card--wide { width: 18.3em; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; } 
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
            .new-interface-info__head span { color: #fff; }
            .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
            .new-interface-info__details { margin-bottom: 1em; display: block; min-height: 1.9em; font-size: 1.1em; }
            .line-one-details { margin-bottom: 0.6em; line-height: 1.5; }
            .genre-details-line { margin-top: 1em; line-height: 1.5; }
            .new-interface-info__split { margin: 0 0.5em; font-size: 0.7em; }
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
            .new-interface .full-start__rate { font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center; vertical-align: middle; background-color: rgba(255, 255, 255, 0.12); padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.4em; overflow: hidden; height: auto; }
            .new-interface .full-start__rate > div { font-weight: normal; font-size: 0.9em; justify-content: center; background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0em 0.2em; border-radius: 0.3em; line-height: 1; order: 1; display: flex; align-items: center; flex-shrink: 0; }
            .rating-logo { height: 1.1em; width: auto; max-width: 75px; vertical-align: middle; order: 2; line-height: 0; }
            .tmdb-logo { height: 0.9em; }
            .rt-logo { height: 1.1em; }
            </style>
            `);
          $('body').append(Lampa.Template.get(style_id, {}, true));
        }
    }


    // --- 12. MDBList Discover Engine (Interactive) ---
    function showCheckboxMenu(action) {
        var items = [], title = '', stateArray = DiscoverState[action];
        if (action === 'types') { title = Lampa.Lang.translate('title_type'); items = [{title: 'Movies', id: 'movie'}, {title: 'TV Shows', id: 'show'}]; }
        else if (action === 'providers') { title = Lampa.Lang.translate('title_provider'); items = [{title: 'IMDb', id: 'imdb'}, {title: 'TMDB', id: 'tmdb'}, {title: 'RT Critics', id: 'tomatoes'}, {title: 'RT Audience', id: 'popcorn'}, {title: 'Metacritic', id: 'metacritic'}, {title: 'Letterboxd', id: 'letterboxd'}]; }
        else if (action === 'genres') { title = Lampa.Lang.translate('title_genre'); if(window.mdblist_genres_dict) { for(var id in window.mdblist_genres_dict) items.push({title: window.mdblist_genres_dict[id], id: id}); } }
        
        items.forEach(function(i) { i.checkbox = true; i.checked = stateArray.indexOf(i.id) !== -1; });
        Lampa.Select.show({ title: title, items: items, onBack: showMDBListDiscoverMenu, onCheck: function(i) {
            var idx = stateArray.indexOf(i.id);
            if (idx !== -1) { 
                stateArray.splice(idx, 1); 
                i.checked = false; 
            } else { 
                stateArray.push(i.id); 
                i.checked = true; 
            }
        }});
    }

    function showNumberMenu(action) {
        var titleKey = action === 'score_min' ? 'title_min_score' : action === 'score_max' ? 'title_max_score' : 'title_' + action;
        var items = [], title = Lampa.Lang.translate(titleKey), isYear = action.indexOf('year') !== -1;
        
        if (isYear) { for(var y = new Date().getFullYear(); y >= 1970; y-=10) items.push({title: y+'', value: y}); }
        else { for(var s = 100; s >= 50; s-=10) items.push({title: s+'', value: s}); }
        items.push({title: 'Custom...', value: 'custom'});
        
        Lampa.Select.show({ title: title, items: items, onBack: showMDBListDiscoverMenu, onSelect: function(i) {
            if (i.value === 'custom') {
                Lampa.Input.edit({ title: title, value: '', free: true, nosave: true }, function(new_val) {
                    var parsed = parseInt(new_val);
                    if (!isNaN(parsed)) DiscoverState[action] = parsed;
                    showMDBListDiscoverMenu();
                });
            } else { DiscoverState[action] = i.value; showMDBListDiscoverMenu(); }
        }});
    }

    function showMDBListDiscoverMenu() {
        if (!window.Lampa) return;
        var isMovie = DiscoverState.types[0] === 'movie';
        var items = [
            { title: Lampa.Lang.translate('title_type'), subtitle: isMovie ? 'Movies' : 'TV Shows', action: 'types' },
            { title: Lampa.Lang.translate('title_provider'), subtitle: DiscoverState.providers.join(', '), action: 'providers' },
            { title: Lampa.Lang.translate('title_min_score'), subtitle: DiscoverState.score_min, action: 'score_min' },
            { title: Lampa.Lang.translate('title_max_score'), subtitle: DiscoverState.score_max, action: 'score_max' },
            { title: Lampa.Lang.translate('title_year_min'), subtitle: DiscoverState.year_min, action: 'year_min' },
            { title: Lampa.Lang.translate('title_year_max'), subtitle: DiscoverState.year_max, action: 'year_max' },
            { title: Lampa.Lang.translate('title_genre'), subtitle: DiscoverState.genres.length ? DiscoverState.genres.length + ' selected' : Lampa.Lang.translate('title_any'), action: 'genres' },
            { title: Lampa.Lang.translate('title_generate'), action: 'generate' }
        ];

        Lampa.Select.show({
            title: Lampa.Lang.translate('title_discover'),
            items: items,
            onBack: function () { Lampa.Controller.toggle('menu'); },
            onSelect: function (item) {
                if (item.action === 'generate') {
                    var apiKey = Lampa.Storage.get('mdblist_api_key');
                    if (!apiKey) { Lampa.Noty.show('MDBList API Key is missing in settings!'); return; }
                    var url = 'https://api.mdblist.com/catalog/' + DiscoverState.types[0] + '/?apikey=' + apiKey;
                    DiscoverState.providers.forEach(function(prov) { url += '&filter_' + prov + 'rating_min=' + DiscoverState.score_min + '&filter_' + prov + 'rating_max=' + DiscoverState.score_max; });
                    if (DiscoverState.genres.length) url += '&filter_genre=' + DiscoverState.genres.join(',');
                    url += '&year_min=' + DiscoverState.year_min + '&year_max=' + DiscoverState.year_max;
                    
                    Lampa.Activity.push({ url: url, title: Lampa.Lang.translate('title_discover'), component: 'mdblist_catalog', page: 1, method: DiscoverState.types[0] });
                } 
                else if (item.action === 'types') { DiscoverState.types = isMovie ? ['show'] : ['movie']; showMDBListDiscoverMenu(); }
                else if (['providers', 'genres'].indexOf(item.action) !== -1) showCheckboxMenu(item.action);
                else if (['score_min', 'score_max', 'year_min', 'year_max'].indexOf(item.action) !== -1) showNumberMenu(item.action);
            }
        });
    }


    
    // --- 13. MDBList Grid Component (With 202 Polling & Safety Limits) ---
    function MDBListCatalogComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var items = [];
        var html = $('<div></div>');
        var next_cursor = null;
        var active = 0;
        var loading = false;
        var MAX_ITEMS = 200; // Hard memory limit to prevent TV freezing

        this.create = function () {
            var _this = this;
            this.activity.loader(true);
            var fetchUrl = object.url;
            if (next_cursor) fetchUrl += '&cursor=' + next_cursor;
            
            var retries = 0;

            // Recursive fetch function to handle MDBList's "202 Building Cache" state
            function doFetch() {
                console.log("DEBUG_MDB REQUEST_URL:", fetchUrl); // <--- Added Log
                network.timeout(15000); 
                network.silent(fetchUrl, function (data, status, xhr) {
                    console.log("DEBUG_MDB SUCCESS_DATA:", data); // <--- Added Log
                    
                    if (data && data.items && data.items.length) {
                        next_cursor = data.next_cursor || null;
                        _this.build(_this.formatData(data.items));
                    } else if (retries < 6) { 
                        retries++;
                        console.log("MDBList Catalog building... Retrying in 5s (Attempt " + retries + ")");
                        setTimeout(doFetch, 5000);
                    } else { _this.empty(); }
                }, function(xhr, status) { 
                    console.log("DEBUG_MDB ERROR_DATA:", xhr ? xhr.status : status, xhr ? xhr.responseText : ''); // <--- Added Log
                    
                    if (xhr && xhr.status === 202 && retries < 6) {
                        retries++;
                        console.log("MDBList Catalog 202 Accepted... Retrying in 5s (Attempt " + retries + ")");
                        setTimeout(doFetch, 5000);
                    } else {
                        _this.empty();
                    }
                });
            }
            
            doFetch(); // Start the first attempt
        };

        this.formatData = function(api_items) {
            return api_items.map(function(i) {
                var isTv = object.method === 'show' || object.method === 'tv';
                return {
                    id: i.ids ? i.ids.tmdb : i.id, title: i.title, name: i.title,
                    poster_path: i.poster_path, backdrop_path: i.backdrop_path,
                    vote_average: i.score ? (i.score / 10) : 0,
                    release_date: i.release_year ? i.release_year + '-01-01' : '',
                    first_air_date: i.release_year ? i.release_year + '-01-01' : '',
                    method: isTv ? 'tv' : 'movie'
                };
            });
        };

        this.appendCards = function(data) {
            var _this = this;
            data.forEach(function (elem) {
                var card = new Lampa.Card(elem, { card_wide: true, object: object });
                card.create();
                card.onEnter = function() { Lampa.Activity.push({ url: '', component: 'full', id: elem.id, method: elem.method, card: elem }); };
                card.onUp = function() { if (active > 0) { active--; items[active].toggle(); } else Lampa.Controller.toggle('head'); };
                card.onDown = function() { if (active < items.length - 1) { active++; items[active].toggle(); } };
                card.onBack = function() { Lampa.Activity.backward(); };
                scroll.append(card.render());
                items.push(card);
            });
        };

        this.build = function (data) {
            var _this = this;
            this.appendCards(data);
            html.append(scroll.render());
            
            // Connect Infinite Scroll
            scroll.onEnd = function() { _this.loadNext(); };
            
            Lampa.Layer.update(html);
            this.activity.loader(false);
            this.activity.toggle();
        };

        this.loadNext = function() {
            var _this = this;
            if (loading || !next_cursor || items.length >= MAX_ITEMS) return;
            loading = true;
            
            var nextUrl = object.url + '&cursor=' + next_cursor;
            var loadRetries = 0;
            
            function doNextFetch() {
                network.silent(nextUrl, function (data) {
                    if (data && data.items && data.items.length) {
                        next_cursor = data.next_cursor || null;
                        _this.appendCards(_this.formatData(data.items));
                        loading = false;
                    } else if (loadRetries < 3) {
                        loadRetries++;
                        setTimeout(doNextFetch, 5000);
                    } else { 
                        next_cursor = null; 
                        loading = false; 
                    }
                }, function(xhr) { 
                    if (xhr && xhr.status === 202 && loadRetries < 3) {
                        loadRetries++;
                        setTimeout(doNextFetch, 5000);
                    } else {
                        loading = false;
                    }
                });
            }
            doNextFetch();
        };

        this.empty = function() { html.append(new Lampa.Empty().render()); this.activity.loader(false); this.activity.toggle(); };
        this.start = function() { Lampa.Controller.add('content', { link: this, toggle: function() { if (items.length) items[active].toggle(); }, up: function() { items[active].onUp(); }, down: function() { items[active].onDown(); }, back: function() { Lampa.Activity.backward(); } }); Lampa.Controller.toggle('content'); };
        this.pause = function() {}; this.stop = function() {}; this.render = function() { return html; };
        this.destroy = function() { network.clear(); scroll.destroy(); if(html) html.remove(); items = null; };
    }
    Lampa.Component.add('mdblist_catalog', MDBListCatalogComponent);
    
    // --- 11. Boot Sequence ---
    if (!window.plugin_interface_ready) startPlugin();
    setTimeout(applyWideDOM, 500);
    injectDiscoverMenu();

})();
