// == Lampa Homepage Wide Card DOM Proof V2 ==
(function () {
    'use strict';

    function proveWideDOM_V2() {
        // Run a silent background check twice a second
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            // Only trigger if we are actively looking at the Home page
            if (activity && activity.component === 'main') {
                
                // Find all standard cards that haven't been converted yet
                var normalCards = $('.card:not(.card--wide):visible');
                
                normalCards.each(function() {
                    var card = $(this);
                    
                    // 1. Secret Sauce: Tap into Lampa's hidden data attached to the HTML element
                    var movie = card[0].data; 
                    
                    // If no data is attached yet, skip and wait for the next cycle
                    if (!movie) return; 

                    // 2. Make it physically wide
                    card.addClass('card--wide');
                    
                    // 3. Fix Image & Quality: Swap vertical poster for high-res horizontal backdrop
                    var imgElement = card.find('.card__img');
                    var horizontalImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    if (horizontalImage) {
                        // Use Lampa's native image API to get the w780 version safely
                        imgElement.attr('src', Lampa.Api.img(horizontalImage, 'w780'));
                    }
                    
                    // 4. Delete Lampa's outside text elements
                    card.find('.card__title, .card__age').remove();
                    
                    // 5. Inject the exact layout using the REAL hidden data
                    var titleText = movie.title || movie.name || "Unknown Title";
                    var synopsis = movie.overview || "No description available.";
                    
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

    // Wait a brief moment for Lampa to boot, then start the watcher
    setTimeout(proveWideDOM_V2, 500);
})();
