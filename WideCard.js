// == Lampa Homepage Wide Card DOM Proof V4 ==
(function () {
    'use strict';

    // 1. Intercept the Home Page API call to capture Lampa's raw TMDB payload
    var original_main_api = Lampa.Api.main;
    Lampa.Api.main = function(params, onsuccess, onerror) {
        return original_main_api(params, function(data) {
            // Save the real TMDB data array so we can extract backdrops and synopses
            window.lampa_master_cache = data;
            onsuccess(data);
        }, onerror);
    };

    function proveWideDOM_V4() {
        // Run a silent background check twice a second
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            // Only trigger if we are actively looking at the Home page and have the cache
            if (activity && activity.component === 'main' && window.lampa_master_cache) {
                
                // Loop through each physical row on the screen
                $('.items-line').each(function(rowIndex) {
                    // Match the physical row to the cached data array row
                    var rowData = window.lampa_master_cache[rowIndex];
                    if (!rowData || !rowData.results) return;

                    // Loop through each un-converted card in this row
                    $(this).find('.card:not(.card--wide):visible').each(function(cardIndex) {
                        var card = $(this);
                        
                        // Match the physical card to the cached movie data
                        var movie = rowData.results[cardIndex];
                        if (!movie) return;

                        // 2. Make it physically wide
                        card.addClass('card--wide');
                        
                        // 3. Upgrade to the real HD Horizontal Backdrop from the cache
                        var hdImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                        if (hdImage) {
                            card.find('.card__img').attr('src', Lampa.Api.img(hdImage, 'w780'));
                        }
                        
                        // 4. Remove Lampa's outside text elements
                        card.find('.card__title, .card__age').remove();
                        
                        // 5. Inject the REAL title and REAL synopsis from the cache
                        var titleText = movie.title || movie.name || "Unknown";
                        var synopsis = movie.overview || "No description available.";
                        
                        var promoHtml = $(
                            '<div class="card__promo">' + 
                                '<div class="card__promo-title">' + titleText + '</div>' + 
                                '<div class="card__promo-text">' + synopsis + '</div>' + 
                            '</div>'
                        );
                        
                        card.find('.card__view').append(promoHtml);
                    });
                });
            }
        }, 500); 
    }

    // Wait a brief moment for Lampa to boot, then start the watcher
    setTimeout(proveWideDOM_V4, 500);
})();
