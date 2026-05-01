// == Lampa Homepage Tracer ==
(function () {
    'use strict';

    console.log("[Tracer] Script injected. Waiting for Lampa to boot...");

    function startTracer() {
        if (!window.Lampa) {
            console.log("[Tracer] ERROR: Lampa core not found after delay.");
            return;
        }
        if (window.tracer_ready) return;
        window.tracer_ready = true;

        console.log("[Tracer] Lampa core found. Hooking into render engines...");

        // 1. Trace the Row Builder
        if (Lampa.InteractionLine) {
            var original_line = Lampa.InteractionLine;
            Lampa.InteractionLine = function (data, params) {
                var activity = Lampa.Activity ? Lampa.Activity.active() : null;
                var current_component = activity ? activity.component : 'unknown';
                
                // Only log if we are on the Home screen ('main')
                if (current_component === 'main') {
                    console.log("[Tracer] InteractionLine building row on Home screen.", {
                        has_data: !!data,
                        params_provided: params
                    });
                }
                return new original_line(data, params);
            };
            console.log("[Tracer] InteractionLine hooked successfully.");
        } else {
            console.log("[Tracer] WARNING: Lampa.InteractionLine does not exist.");
        }

        // 2. Trace the Card Builder to see if Home screen uses it directly
        if (Lampa.Card) {
            var original_card = Lampa.Card;
            Lampa.Card = function (data, params) {
                var activity = Lampa.Activity ? Lampa.Activity.active() : null;
                if (activity && activity.component === 'main') {
                    // We only log once per row to avoid flooding the console
                    if (!window.card_logged_once) {
                        console.log("[Tracer] First Card building on Home screen.", {
                            params_provided: params
                        });
                        window.card_logged_once = true;
                    }
                }
                return new original_card(data, params);
            };
            console.log("[Tracer] Card factory hooked successfully.");
        }
    }

    // Wait exactly 2 seconds for Lampa and all native plugins to finish loading
    setTimeout(startTracer, 2000);
})();
