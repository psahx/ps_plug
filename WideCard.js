// == Lampa Homepage Wide Card V14 (Native Data Hook) ==
(function () {
    'use strict';

    function applyWideDOM() {
        // Run a lightweight watcher twice a second
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            if (activity && (activity.component === 'main' || activity.component === 'category')) {
                
                // Find all cards that are still narrow
                $('.card:not(.card--wide):visible').each(function() {
                    var card = $(this);
                    
                    // THE HOLY GRAIL: Read Lampa's custom data property directly off the DOM element
                    var movie = this.card_data; 
                    
                    // If the data hasn't been attached yet, skip and wait for the next cycle
                    if (!movie || !movie.id) return; 

                    // 1. Make it physically wide
                    card.addClass('card--wide');
                    
                    // 2. Upgrade the image using the data we just pulled
                    var imgElement = card.find('.card__img');
                    var targetImage = movie.backdrop_path ? movie.backdrop_path : movie.poster_path;
                    
                    if (targetImage) {
                        imgElement.attr('src', Lampa.Api.img(targetImage, 'w780'));
                        imgElement.css({ 'object-fit': 'cover', 'object-position': 'top' });
                    }
                    
                    // 3. Extract and cleanly truncate the text
                    var titleText = movie.title || movie.name || card.find('.card__title').text() || "Unknown";
                    var synopsis = movie.overview || "";
                    if (synopsis.length > 115) {
                        synopsis = synopsis.substring(0, 115) + '...';
                    }
                    
                    // 4. Remove old text and inject the wide layout
                    card.find('.card__title, .card__age').remove();
                    
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

    // Give Lampa a fraction of a second to boot, then start the watcher
    setTimeout(applyWideDOM, 500);
})();
