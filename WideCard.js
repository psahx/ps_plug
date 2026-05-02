// == Lampa Homepage Tracer V3 ==
(function () {
    'use strict';

    console.log("[Tracer V3] Booting Card scanner...");
    var hookedCard = false;

    function tryHook() {
        if (window.Lampa && Lampa.Card && !hookedCard) {
            var original_card = Lampa.Card;
            
            Lampa.Card = function (data, params) {
                // Log when a card is built, and what instructions it was given
                console.log("[Tracer V3] Building Card | Title:", (data.title || data.name), "| Params:", params);
                
                return new original_card(data, params);
            };
            
            hookedCard = true;
            console.log("[Tracer V3] Hooked Lampa.Card successfully!");
        }
    }

    tryHook();
    var scanner = setInterval(function() {
        if (hookedCard) {
            clearInterval(scanner);
        } else {
            tryHook();
        }
    }, 50);

})();
