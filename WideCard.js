// == Lampa Homepage Wide Card DOM Proof V5 ==
(function () {
    'use strict';

    // 1. Create a bulletproof dictionary using the image filename as the unique key
    window.lampa_movie_dict = window.lampa_movie_dict || {};

    // 2. Intercept the data and map every movie into our dictionary
    var original_main_api = Lampa.Api.main;
    Lampa.Api.main = function(params, onsuccess, onerror) {
        return original_main_api(params, function(data) {
            
            function extractMovies(items) {
                if (!items) return;
                items.forEach(function(item) {
                    if (item.poster_path) {
                        window.lampa_movie_dict[item.poster_path] = item;
                    }
                    if (item.results) extractMovies(item.results); // Dig into the category rows
                });
            }
            extractMovies(data.results || data);
            
            onsuccess(data);
        }, onerror);
    };

    function proveWideDOM_V5() {
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && activity.component === 'main') {
                
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    // 3. Extract the image filename from the current card
                    var imgElement = card.find('.card__img');
                    var currentSrc = imgElement.attr('src') || "";
                    var pathParts = currentSrc.split('/');
                    var filename = '/' + pathParts[pathParts.length - 1]; // gets "/eTp7gSPk...jpg"
                    
                    // 4. Look up the exact movie in our dictionary
                    var movie = window.lampa_movie_dict[filename];
                    if (!movie) return;

                    // Make it physically wide
                    card.addClass('card--wide');
                    
                    // Fix Image Cropping: Strictly use vertical POSTER data, but in high-res w780
                    card.find('.card__img').attr('src', Lampa.Api.img(movie.poster_path, 'w780'));
                    
                    // Fix Text Overlap: Mimic Lampa's native 115-character truncation
                    var titleText = movie.title || movie.name || "Unknown";
                    var synopsis = movie.overview || "No description available.";
                    if (synopsis.length > 115) {
                        synopsis = synopsis.substring(0, 115) + '...';
                    }
                    
                    // Remove Lampa's outside text elements
                    card.find('.card__title, .card__age').remove();
                    
                    // Inject the EXACT layout from the "Watch in cinemas" HTML
                    var promoHtml = $(
                        '<div class="card__promo">' + 
                            '<div class="card__promo-title">' + titleText + '</div>' + 
                            '<div class="card__promo-text">' + synopsis + '</div>' + 
                        '</div>'
                    );
                    
                    card.find('.card__view').append(promoHtml);
                });
            }
        }, 500); 
    }

    setTimeout(proveWideDOM_V5, 500);
})();
