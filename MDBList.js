// == Lampa Plugin: Interface Patcher - Step 1 ==
// Purpose: Inject CSS and verify identification via flag polling.
//          Does NOT apply any functional patches yet.
// Strategy: Poll for window.plugin_interface_ready, then wrap Lampa.InteractionMain.
// Version: 1.6 (Flag Polling Init)
(function (window) {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 1 v1.6 (Flag Poll)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step1';
    const TARGET_CLASS = 'new-interface';
    const POLLING_INTERVAL_MS = 250; // Check every 250ms
    const MAX_POLLING_ATTEMPTS = 60; // Try for ~15 seconds (60 * 250ms)

    // --- CSS Injection Function ---
    function injectCSS() {
        if (!window.Lampa || !Lampa.Template || !window.$) { console.error(`${PLUGIN_NAME}: CSS Inject FAIL - Lampa/$ not ready.`); return; }
        console.log(`${PLUGIN_NAME}: Attempt CSS inject...`);
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) { /*console.log(`${PLUGIN_NAME}: CSS already injected.`);*/ return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content as provided before ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css); $('body').append(Lampa.Template.get(STYLE_ID, {}, !0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }

    // --- Wrapper and Initialization Logic ---
    let originalInteractionMainFactory = null;
    let pluginInitializationSucceeded = false; // Track if wrapping succeeded
    let pollingIntervalId = null; // ID for the polling interval
    let pollingAttempts = 0; // Counter for polling attempts

    // Wrapper function (still only logs, no patching)
    function ourWrappedFactory(object) {
        console.log(`${PLUGIN_NAME}: Wrapped factory called for source:`, object?.source);
        let instance = null;
        try { if (!originalInteractionMainFactory) { throw new Error("Original factory not captured."); } instance = originalInteractionMainFactory(object); console.log(`${PLUGIN_NAME}: Original factory executed. Returned instance:`, !!instance); }
        catch (e) { console.error(`${PLUGIN_NAME}: Error calling original factory`, e); return instance; }
        if (!instance) { console.warn(`${PLUGIN_NAME}: Original factory returned null instance.`); return instance; }
        let conditionsMet = false, isCorrectInstance = false;
        try {
            conditionsMet = (object.source == 'tmdb' || object.source == 'cub') && (window.innerWidth >= 767) && Lampa.Account.hasPremium() && (Lampa.Manifest.app_digital >= 153);
            if (instance.render) { const renderedEl = instance.render(); isCorrectInstance = renderedEl && typeof renderedEl.hasClass === 'function' && renderedEl.hasClass(TARGET_CLASS); }
            console.log(`${PLUGIN_NAME}: Wrapper ID check: conditionsMet=${conditionsMet}, isCorrectInstance=${isCorrectInstance}`);
        } catch (e) { console.error(`${PLUGIN_NAME}: Error during ID checks`, e); }
        if (conditionsMet && isCorrectInstance) { console.log(`%c${PLUGIN_NAME}: Target instance identified. [PATCHING SKIPPED - STEP 1]`, 'color: blue; font-weight: bold;'); }
        else { console.log(`${PLUGIN_NAME}: Instance is NOT target OR conditions not met.`); }
        return instance; // Return original instance
    }

    // Core initialization function (captures and wraps)
    function initPlugin() {
        if (pluginInitializationSucceeded) { return; } // Run only once
        console.log(`${PLUGIN_NAME}: initPlugin() called. Attempting final wrap...`);
        try {
            if (typeof Lampa.InteractionMain === 'function') {
                originalInteractionMainFactory = Lampa.InteractionMain;
                Lampa.InteractionMain = ourWrappedFactory;
                pluginInitializationSucceeded = true; // Mark success
                console.log(`%c${PLUGIN_NAME}: Successfully captured and wrapped Lampa.InteractionMain.`, 'color: green; font-weight: bold;');
            } else {
                console.error(`${PLUGIN_NAME}: Lampa.InteractionMain is not a function at final init time! Cannot wrap.`);
            }
        } catch (e) {
            console.error(`${PLUGIN_NAME}: CRITICAL Error during initPlugin execution:`, e);
        }
    }

    // Polling function to check for the CUB interface flag
    function checkFlagAndInit() {
        // Stop checking if plugin already initialized successfully
        if (pluginInitializationSucceeded) {
            if (pollingIntervalId) clearInterval(pollingIntervalId);
            pollingIntervalId = null;
            return;
        }

        pollingAttempts++;
        // console.debug(`${PLUGIN_NAME}: Polling attempt #${pollingAttempts}/${MAX_POLLING_ATTEMPTS} for window.plugin_interface_ready... Value:`, window.plugin_interface_ready);

        // Check for the flag set by the CUB script
        if (window.plugin_interface_ready === true) {
            console.log(`%c${PLUGIN_NAME}: Flag window.plugin_interface_ready detected! (Attempt #${pollingAttempts}). Calling initPlugin().`, 'color: green');
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Stop polling
            pollingIntervalId = null;
            initPlugin(); // Initialize the wrapping mechanism
        } else if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            console.warn(`${PLUGIN_NAME}: Max polling attempts reached (${MAX_POLLING_ATTEMPTS}) without detecting flag window.plugin_interface_ready. Wrapping WILL NOT occur.`);
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Stop polling
            pollingIntervalId = null;
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS(); // Inject CSS

            // ** Start polling for the CUB interface flag **
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Clear previous just in case
            pollingAttempts = 0;
            console.log(`${PLUGIN_NAME}: Starting polling for flag 'window.plugin_interface_ready' (Max ${MAX_POLLING_ATTEMPTS} attempts @ ${POLLING_INTERVAL_MS}ms)...`);

            // Perform an initial check immediately in case flag is already set
            checkFlagAndInit();

            // Start interval only if not already initialized by the first check
            if (!pluginInitializationSucceeded && !pollingIntervalId) {
                 pollingIntervalId = setInterval(checkFlagAndInit, POLLING_INTERVAL_MS);
            }
        }
    });

    // Add language string potentially needed (safe check)
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(window);
