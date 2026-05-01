// == Lampa Wide Card Layout Test V2 ==
(function () {
    'use strict';

    function startLayoutTest() {
        if (!window.Lampa || !Lampa.Card) return;
        window.layout_test_ready = true;

        // 1. Save Lampa's native Card builder
        var original_card = Lampa.Card;

        // 2. Intercept it at the moment a card is created
        Lampa.Card = function (data, params) {
            // Check what page we are currently on
            var current_activity = Lampa.Activity.active();
            
            // If we are on the Home page ('main' component)...
            if (current_activity && current_activity.component === 'main') {
                if (!params) params = {};
                // ...force the Card Factory to use the "Watch in cinemas" wide layout
                params.card_wide = true; 
            }
            
            // Pass it back to Lampa to draw
            return new original_card(data, params);
        };

        console.log("Layout Test V2: Card interceptor applied.");
    }

    // Give Lampa a split second to load its native classes before intercepting
    setTimeout(function() {
        if (!window.layout_test_ready) startLayoutTest();
    }, 500);
})();
