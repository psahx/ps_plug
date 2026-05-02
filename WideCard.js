// == Lampa Homepage Wide Card DOM Proof ==
(function () {
    'use strict';

    function proveWideDOM() {
        // Run a silent background check twice a second
        setInterval(function() {
            var activity = window.Lampa && Lampa.Activity ? Lampa.Activity.active() : null;
            
            // Only trigger if we are actively looking at the Home page
            if (activity && activity.component === 'main') {
                
                // Find all standard cards that haven't been converted yet
                var normalCards = $('.card:not(.card--wide):visible');
                
                normalCards.each(function() {
                    var card = $(this);
                    
                    // 1. Make it physically wide
                    card.addClass('card--wide');
                    
                    // 2. Extract the existing title that Lampa placed outside
                    var titleText = card.find('.card__title').text();
                    
                    // 3. Delete Lampa's outside text elements
                    card.find('.card__title, .card__age').remove();
                    
                    // 4. Inject the exact HTML structure of a Wide Card inside the image view
                    var promoHtml = $(
                        '<div class="card__promo">' + 
                            '<div class="card__promo-title">' + titleText + '</div>' + 
                            '<div class="card__promo-text">Design proof: Wide layout successfully forced via DOM injection. No lag, no loops.</div>' + 
                        '</div>'
                    );
                    
                    card.find('.card__view').append(promoHtml);
                });
            }
        }, 500); 
    }

    // Wait a brief moment for Lampa to boot, then start the silent watcher
    setTimeout(proveWideDOM, 500);
})();
