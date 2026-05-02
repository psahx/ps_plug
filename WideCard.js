// == Lampa Homepage Tracer V2 ==
(function () {
    'use strict';

    console.log("[Tracer V2] Booting scanner...");

    var hookedLine = false;

    function tryHook() {
        if (window.Lampa && Lampa.InteractionLine && !hookedLine) {
            var original_line = Lampa.InteractionLine;
            
            Lampa.InteractionLine = function (data, params) {
                // Get the current active screen
                var act = window.Lampa.Activity ? window.Lampa.Activity.active() : null;
                var comp = act ? act.component : 'unknown_boot';
                
                // Log every single row Lampa tries to draw, right as it happens
                console.log("[Tracer V2] Drawing Row! Component:", comp, " | Wide Param:", (params ? params.card_wide : false));
                
                return new original_line(data, params);
            };
            
            hookedLine = true;
            console.log("[Tracer V2] Hooked InteractionLine successfully!");
        }
    }

    // Try hooking immediately
    tryHook();
    
    // If Lampa isn't ready yet, check every 50 milliseconds until it is
    var scanner = setInterval(function() {
        if (hookedLine) {
            clearInterval(scanner); // Stop scanning once we hook it
        } else {
            tryHook();
        }
    }, 50);

})();
