// == Lampa Homepage MDBList Phase 2.1 (Silent Fetch + EXACT Menus) ==
(function () {
    'use strict';

    // --- 1. Fetcher Configuration ---
    var config = {
        api_url: 'https://api.mdblist.com/tmdb/', 
        cache_time: 60 * 60 * 12 * 1000, 
        cache_key: 'mdblist_ratings_cache', 
        cache_limit: 500, 
        request_timeout: 10000 
    };

    var network = (window.Lampa && Lampa.Reguest) ? new Lampa.Reguest() : null;

    // --- 2. Language Strings (EXACT COPY) ---
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            mdblist_api_key_desc: {
                ru: "Введите ваш API ключ с сайта MDBList.com",
                en: "Enter your API key from MDBList.com",
                uk: "Введіть ваш API ключ з сайту MDBList.com"
            },
            additional_ratings_title: {
                 ru: "Дополнительные Рейтинги", 
                 en: "Additional Ratings",
                 uk: "Додаткові Рейтинги"
            },
            select_ratings_button_name: {
                 en: "Select Rating Providers",
                 ru: "Выбрать Источники Рейтингов",
                 uk: "Обрати Джерела Рейтингів"
            },
            select_ratings_button_desc: {
                 en: "Choose which ratings to display",
                 ru: "Выберите, какие рейтинги отображать",
                 uk: "Оберіть, які рейтинги відображати"
            },
            select_ratings_dialog_title: {
                 en: "Select Ratings",
                 ru: "Выбор Рейтингов",
                 uk: "Вибір Рейтингів"
            },
            logo_toggle_name: {
                ru: "Логотип вместо заголовка",
                en: "Logo Instead of Title",
                uk: "Логотип замість заголовка"
            },
            logo_toggle_desc: {
                ru: "Заменяет текстовый заголовок фильма логотипом",
                en: "Replaces movie text title with a logo",
                uk: "Замінює текстовий заголовок логотипом"
            },
            settings_show: {
                ru: "Показать",
                en: "Show", 
                uk: "Показати"
            },
            settings_hide: {
                ru: "Скрыть",
                en: "Hide", 
                uk: "Приховати"
            },
            full_notext: { 
                en: 'No description', 
                ru: 'Нет описания',
                uk: 'Немає опису'
            },
            info_panel_logo_height_name: {
                ru: "Размер логотипа",
                en: "Logo Size",
                uk: "Висота логотипу"
            },
            info_panel_logo_height_desc: {
                ru: "Максимальная высота логотипа",
                en: "Maximum logo height",
                uk: "Максимальна высота логотипу"
            }
        });
    }

    // --- 3. Settings UI Registration (EXACT COPY) ---
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: 'additional_ratings',
            name: Lampa.Lang.translate('additional_ratings_title'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="32" height="32" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: {
                name: 'mdblist_api_key', 
                type: 'input',          
                'default': '',          
                values: {},             
                placeholder: 'Enter your MDBList API Key' 
            },
            field: {
                name: 'MDBList API Key', 
                description: Lampa.Lang.translate('mdblist_api_key_desc') 
            },
            onChange: function() {
                Lampa.Settings.update();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: {
                name: 'select_ratings_button', 
                type: 'button'                 
            },
            field: {
                name: Lampa.Lang.translate('select_ratings_button_name'),
                description: Lampa.Lang.translate('select_ratings_button_desc')
            },
            onChange: function () {
                showRatingProviderSelection();
            }
        });
                
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings',        
            param: {
                name: 'show_logo_instead_of_title', 
                type: 'select',                     
                values: {                           
                    'true': Lampa.Lang.translate('settings_show'), 
                    'false': Lampa.Lang.translate('settings_hide') 
                },
                'default': 'false'                  
            },
            field: {
                name: Lampa.Lang.translate('logo_toggle_name'), 
                description: Lampa.Lang.translate('logo_toggle_desc') 
            },
            onChange: function(value) {
                var storageKey = 'show_logo_instead_of_title'; 
                Lampa.Storage.set(storageKey, value); 
            }
        });
                
        Lampa.SettingsApi.addParam({
            component: 'additional_ratings', 
            param: {
                name: 'info_panel_logo_max_height', 
                type: 'select',
                values: {
                    '50': '50px', '75': '75px', '100': '100px', '125': '125px',
                    '150': '150px', '175': '175px', '200': '200px', '225': '225px',
                    '250': '250px', '300': '300px', '350': '350px', '400': '400px',
                    '450': '450px', '500': '500px'
                },
                'default': '100'
            },
            field: {
                name: Lampa.Lang.translate('info_panel_logo_height_name'), 
                description: Lampa.Lang.translate('info_panel_logo_height_desc') 
            },
            onChange: function(value) {
                Lampa.Storage.set('info_panel_logo_max_height', value);
            }
        });
    }

    // --- 4. Rating Selection Dialog (EXACT COPY) ---
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
            return {
                title: provider.title,
                id: provider.id,          
                checkbox: true,         
                checked: isChecked,       
                default: provider.default 
            };
        });

        var currentController = Lampa.Controller.enabled().name;

        Lampa.Select.show({
            title: Lampa.Lang.translate('select_ratings_dialog_title'), 
            items: selectItems,                                        
            onBack: function () {                                      
                Lampa.Controller.toggle(currentController || 'settings');
            },
            onCheck: function (item) { 
                let oldValue = Lampa.Storage.get(item.id, item.default);
                let oldStateIsChecked = (oldValue === true || oldValue === 'true');
                let newStateIsChecked = !oldStateIsChecked;
                Lampa.Storage.set(item.id, newStateIsChecked);
                item.checked = newStateIsChecked;
            }
        });
    }

    // --- 5. Caching Functions (EXACT COPY) ---
    function getCache(tmdb_id) {
        if (!window.Lampa || !Lampa.Storage) return false;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {}); 

        if (cache[tmdb_id]) {
            if ((timestamp - cache[tmdb_id].timestamp) > config.cache_time) {
                delete cache[tmdb_id];
                Lampa.Storage.set(config.cache_key, cache); 
                return false;
            } 
          return cache[tmdb_id].data; 
        }
        return false;
    }

    function setCache(tmdb_id, data) {
        if (!window.Lampa || !Lampa.Storage) return;
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache(config.cache_key, config.cache_limit, {});
        cache[tmdb_id] = { timestamp: timestamp, data: data };
        Lampa.Storage.set(config.cache_key, cache); 
    }

    // --- 6. Core Fetching Logic (EXACT COPY) ---
    function fetchRatings(movieData, callback) {
        if (!network) return callback ? callback({ error: "Network unavailable" }) : null;
        if (!movieData || !movieData.id || !movieData.method || !callback) return callback ? callback({ error: "Invalid input" }) : null;

        var tmdb_id = movieData.id;
        var cached_ratings = getCache(tmdb_id);
        if (cached_ratings) {
            callback(cached_ratings);
            return;
        }

        var apiKey = Lampa.Storage.get('mdblist_api_key');
        if (!apiKey) {
            callback({ error: "MDBList API Key not configured in Additional Ratings settings" });
            return;
        }

        var media_type = movieData.method === 'tv' ? 'show' : 'movie';
        var api_url = "".concat(config.api_url).concat(media_type, "/").concat(tmdb_id, "?apikey=").concat(apiKey);
        
        network.clear(); 
        network.timeout(config.request_timeout);
        network.silent(api_url, function (response) {
            var ratingsResult = { error: null }; 
            if (response && response.ratings && Array.isArray(response.ratings)) {
                 response.ratings.forEach(function(rating) {
                     if (rating.source && rating.value !== null) {
                          ratingsResult[rating.source] = rating.value;
                     }
                 });
            } else if (response && response.error) {
                ratingsResult.error = "MDBList API Error: " + response.error;
            } else {
                 ratingsResult.error = "Invalid response format from MDBList";
            }

            if (ratingsResult.error === null || (ratingsResult.error && !ratingsResult.error.toLowerCase().includes("invalid api key"))) {
                 setCache(tmdb_id, ratingsResult);
            }
            callback(ratingsResult);
        }, function (xhr, status) {
            var errorMessage = "MDBList request failed";
            if (status) { errorMessage += " (Status: " + status + ")"; }
            var errorResult = { error: errorMessage };
            if (status !== 401 && status !== 403) {
                setCache(tmdb_id, errorResult);
            }
            callback(errorResult);
        }); 
    }

    // --- 7. The V14 Layout Watcher + Silent Hook ---
    function applyWideDOM() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    var movie = this.card_data; 
                    if (!movie || !movie.id) return; 

                    // V14 Layout Changes
                    card.addClass('card--wide');
                    var imgElement = card.find('.card__img');
                    var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (targetImage) {
                        imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                        imgElement.css({ 'object-fit': 'cover', 'object-position': 'top' });
                    }
                    
                    var titleText = movie.title || movie.name || card.find('.card__title').text() || "Unknown";
                    var synopsis = movie.overview || "";
                    if (synopsis.length > 115) synopsis = synopsis.substring(0, 115) + '...';
                    
                    card.find('.card__title, .card__age').remove();
                    card.find('.card__view').append(
                        '<div class="card__promo">' + 
                            '<div class="card__promo-title">' + titleText + '</div>' + 
                            '<div class="card__promo-text">' + synopsis + '</div>' + 
                        '</div>'
                    );

                    // The Phase 2 Silent Fetch Hook
                    if (!this.mdblist_fetched) {
                        this.mdblist_fetched = true;
                        
                        var method = movie.method || (movie.name ? 'tv' : 'movie');
                        
                        fetchRatings({ id: movie.id, method: method }, function(ratings) {
                            if (ratings.error) {
                                console.log("🔴 [MDBList Error] " + titleText + ": " + ratings.error);
                            } else {
                                var scores = [];
                                if (ratings.imdb) scores.push("IMDb: " + ratings.imdb);
                                if (ratings.tomatoes) scores.push("RT: " + ratings.tomatoes);
                                if (ratings.metacritic) scores.push("Meta: " + ratings.metacritic);
                                
                                console.log("🟢 [MDBList Success] " + titleText + " | " + (scores.length ? scores.join(" | ") : "No scores"));
                            }
                        });
                    }
                });
            }
        }, 500); 
    }

    setTimeout(applyWideDOM, 500);
})();
