// == Lampa Wide Card Layout Test ==
(function () {
    'use strict';

    function startLayoutTest() {
        if (!window.Lampa || !Lampa.InteractionLine) return;
        window.layout_test_ready = true;

        // 1. Save Lampa's original row builder
        var original_line = Lampa.InteractionLine;

        // 2. Intercept and override it
        Lampa.InteractionLine = function (data, params) {
            // If Lampa is drawing a line on the main TMDB/CUB pages...
            if (params && params.object && (params.object.source === 'tmdb' || params.object.source === 'cub')) {
                // ...force it to use the "Watch in cinemas" wide layout
                params.card_wide = true; 
            }
            
            // Pass it back to Lampa to do the actual heavy lifting
            return new original_line(data, params);
        };

        console.log("Layout Test: Wide cards enforced.");
    }

    if (!window.layout_test_ready) startLayoutTest();
})();
