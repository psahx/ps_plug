// == Lampa Plugin: Interface Patcher - Step 1 ==
// Purpose: Test listener attachment timing for 'activity_ready'.
// Version: 1.4 (Listener Timing Test)
(function (window) {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 1 v1.4 (Timing Test)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step1';

    // --- CSS Injection Function ---
    function injectCSS() {
        if (!window.Lampa || !Lampa.Template || !window.$) { console.error(`${PLUGIN_NAME}: Cannot inject CSS - Lampa/$ not ready.`); return; }
        console.log(`${PLUGIN_NAME}: Attempting CSS injection...`);
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) { console.log(`${PLUGIN_NAME}: CSS already injected.`); return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error injecting CSS`, e); }
    }

    // --- Wrapper and Initialization Logic (Defined but NOT called) ---
    // These are kept defined but should not execute in this test version
    let originalInteractionMainFactory = null;
    let pluginInitializationSucceeded = false;
    function ourWrappedFactory(object) { console.error(`${PLUGIN_NAME}: WRAPPED FACTORY UNEXPECTEDLY CALLED`); if (originalInteractionMainFactory) return originalInteractionMainFactory(object); return null; }
    function initPlugin() { console.error(`${PLUGIN_NAME}: initPlugin UNEXPECTEDLY CALLED`); /* ... */ }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);

    // ** NEW: Attempt to attach activity_ready listener IMMEDIATELY **
    try {
        if (window.Lampa && Lampa.Listener) { // Check if Listener exists before attaching
            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                console.log(`%c${PLUGIN_NAME}: activity_ready listener FIRED! (Attached EARLY) Event:`, 'color: orange; font-weight: bold;', activityEvent);
            });
            console.log(`${PLUGIN_NAME}: 'activity_ready' listener attached EARLY.`);
        } else {
             console.warn(`${PLUGIN_NAME}: Lampa.Listener not ready for EARLY attachment.`);
        }
    } catch (earlyError) {
        console.error(`${PLUGIN_NAME}: Error attaching 'activity_ready' listener EARLY:`, earlyError);
    }

    // Attach listeners inside 'app:ready' as before
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS(); // Inject CSS on app ready

            // ** NEW: Add a control listener for 'keydown' **
            try {
                let keydownCount = 0;
                Lampa.Listener.follow('keydown', (keydownEvent) => {
                    keydownCount++;
                    // Log only first few keydown events to avoid flooding console
                    if (keydownCount <= 5) {
                        console.log(`%c${PLUGIN_NAME}: Keydown listener FIRED! (Count: ${keydownCount}) Event:`, 'color: lightblue;', keydownEvent);
                    }
                    if (keydownCount == 5) {
                         console.log(`${PLUGIN_NAME}: (Further keydown logs suppressed)`);
                    }
                });
                console.log(`${PLUGIN_NAME}: 'keydown' listener attached successfully inside app:ready.`);
            } catch (keydownError) {
                 console.error(`${PLUGIN_NAME}: Error attaching 'keydown' listener:`, keydownError);
            }

             // Also re-attach activity_ready listener here in case early attachment failed
             // This helps confirm if attachment *inside* app:ready works at all, even if timing is off
             try {
                 Lampa.Listener.follow('activity_ready', (activityEvent) => {
                     console.log(`%c${PLUGIN_NAME}: activity_ready listener FIRED! (Attached LATE in app:ready) Event:`, 'color: yellow;', activityEvent);
                 });
                 console.log(`${PLUGIN_NAME}: 'activity_ready' listener attached LATE (inside app:ready).`);
             } catch (lateError) {
                  console.error(`${PLUGIN_NAME}: Error attaching 'activity_ready' listener LATE:`, lateError);
             }

        }
    });

    // Add language string potentially needed (safe check)
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(window);
// == Lampa Plugin: Interface Patcher - Step 1 ==
// Purpose: Test listener attachment timing for 'activity_ready'.
// Version: 1.4 (Listener Timing Test)
(function (window) {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 1 v1.4 (Timing Test)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step1';

    // --- CSS Injection Function ---
    function injectCSS() {
        if (!window.Lampa || !Lampa.Template || !window.$) { console.error(`${PLUGIN_NAME}: Cannot inject CSS - Lampa/$ not ready.`); return; }
        console.log(`${PLUGIN_NAME}: Attempting CSS injection...`);
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) { console.log(`${PLUGIN_NAME}: CSS already injected.`); return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error injecting CSS`, e); }
    }

    // --- Wrapper and Initialization Logic (Defined but NOT called) ---
    // These are kept defined but should not execute in this test version
    let originalInteractionMainFactory = null;
    let pluginInitializationSucceeded = false;
    function ourWrappedFactory(object) { console.error(`${PLUGIN_NAME}: WRAPPED FACTORY UNEXPECTEDLY CALLED`); if (originalInteractionMainFactory) return originalInteractionMainFactory(object); return null; }
    function initPlugin() { console.error(`${PLUGIN_NAME}: initPlugin UNEXPECTEDLY CALLED`); /* ... */ }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);

    // ** NEW: Attempt to attach activity_ready listener IMMEDIATELY **
    try {
        if (window.Lampa && Lampa.Listener) { // Check if Listener exists before attaching
            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                console.log(`%c${PLUGIN_NAME}: activity_ready listener FIRED! (Attached EARLY) Event:`, 'color: orange; font-weight: bold;', activityEvent);
            });
            console.log(`${PLUGIN_NAME}: 'activity_ready' listener attached EARLY.`);
        } else {
             console.warn(`${PLUGIN_NAME}: Lampa.Listener not ready for EARLY attachment.`);
        }
    } catch (earlyError) {
        console.error(`${PLUGIN_NAME}: Error attaching 'activity_ready' listener EARLY:`, earlyError);
    }

    // Attach listeners inside 'app:ready' as before
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS(); // Inject CSS on app ready

            // ** NEW: Add a control listener for 'keydown' **
            try {
                let keydownCount = 0;
                Lampa.Listener.follow('keydown', (keydownEvent) => {
                    keydownCount++;
                    // Log only first few keydown events to avoid flooding console
                    if (keydownCount <= 5) {
                        console.log(`%c${PLUGIN_NAME}: Keydown listener FIRED! (Count: ${keydownCount}) Event:`, 'color: lightblue;', keydownEvent);
                    }
                    if (keydownCount == 5) {
                         console.log(`${PLUGIN_NAME}: (Further keydown logs suppressed)`);
                    }
                });
                console.log(`${PLUGIN_NAME}: 'keydown' listener attached successfully inside app:ready.`);
            } catch (keydownError) {
                 console.error(`${PLUGIN_NAME}: Error attaching 'keydown' listener:`, keydownError);
            }

             // Also re-attach activity_ready listener here in case early attachment failed
             // This helps confirm if attachment *inside* app:ready works at all, even if timing is off
             try {
                 Lampa.Listener.follow('activity_ready', (activityEvent) => {
                     console.log(`%c${PLUGIN_NAME}: activity_ready listener FIRED! (Attached LATE in app:ready) Event:`, 'color: yellow;', activityEvent);
                 });
                 console.log(`${PLUGIN_NAME}: 'activity_ready' listener attached LATE (inside app:ready).`);
             } catch (lateError) {
                  console.error(`${PLUGIN_NAME}: Error attaching 'activity_ready' listener LATE:`, lateError);
             }

        }
    });

    // Add language string potentially needed (safe check)
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(window);
