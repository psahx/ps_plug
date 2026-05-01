// == Lampa Homepage Wide Card PROOF ==
(function () {
    'use strict';

    function proveWideCards() {
        if (!window.Lampa || !Lampa.InteractionLine) return;
        if (window.proof_wide_ready) return;
        window.proof_wide_ready = true;

        // 1. Save Lampa's native row builder
        var original_line = Lampa.InteractionLine;

        // 2. Intercept it when it tries to draw a row
        Lampa.InteractionLine = function (data, params) {
            
            // 3. Safely check if we are on the Home screen ('main' component)
            var activity = Lampa.Activity.active();
            if (activity && activity.component === 'main') {
                
                // 4. Force the native wide card layout
                if (!params) params = {};
                params.card_wide = true;
                
                // 5. Inject a fallback synopsis so the wide template doesn't crash
                if (data && (data.results || data.items || data.card)) {
                    var items = data.results || data.items || data.card;
                    items.forEach(function(movie) {
                        if (!movie.overview) {
                            movie.overview = "Synopsis not provided by Home Page API, but the wide layout is rendering successfully.";
                        }
                    });
                }
            }
            
            // Pass the modified instructions back to Lampa
            return new original_line(data, params);
        };
        
        console.log("Proof Script: Native wide layout forced on Home Page.");
    }

    // Wait 1 second to ensure Lampa's core is fully loaded before intercepting
    setTimeout(proveWideCards, 1000);
})();
