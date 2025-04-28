// == Lampa Plugin: Interface Patcher - Step 1 ==
// Purpose: Inject CSS and verify identification of the target CUB/New Interface component.
//          Uses limited polling after activity_ready. Does NOT apply patches yet.
// Strategy: Wrap Lampa.InteractionMain, use Listener + Polling Check for init trigger.
// Version: 1.2 (Polling Init Trigger) 
(function (window) {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 1 v1.2 (Polling)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing at script start.`);
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step1';
    const TARGET_CLASS = 'new-interface';
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info';
    const MAX_CHECK_ATTEMPTS = 15; // How many times to check after activity_ready
    const CHECK_INTERVAL_MS = 200; // Milliseconds between checks

    // --- CSS Injection Function ---
    function injectCSS() {
        if (!window.Lampa || !Lampa.Template || !window.$) { console.error(`${PLUGIN_NAME}: Cannot inject CSS - Lampa.Template or jQuery ($) not ready.`); return; }
        console.log(`${PLUGIN_NAME}: Attempting CSS injection...`);
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) { console.log(`${PLUGIN_NAME}: CSS already injected.`); return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content as provided before ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID,css); $('body').append(Lampa.Template.get(STYLE_ID,{},!0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch(e){ console.error(`${PLUGIN_NAME}: CSS injection error`,e); }
    }

    // --- Wrapper and Initialization Logic ---
    let originalInteractionMainFactory = null;
    let pluginInitializationSucceeded = false;
    let checkIntervalId = null; // ID for the polling interval
    let checkAttempts = 0; // Counter for polling attempts

    // Wrapper function (remains the same, only logs, no patching yet)
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
        if (pluginInitializationSucceeded) return;
        console.log(`${PLUGIN_NAME}: initPlugin() called. Attempting final wrap...`);
        try {
            if (typeof Lampa.InteractionMain === 'function') {
                originalInteractionMainFactory = Lampa.InteractionMain;
                Lampa.InteractionMain = ourWrappedFactory;
                pluginInitializationSucceeded = true; // Mark success
                console.log(`%c${PLUGIN_NAME}: Successfully captured and wrapped Lampa.InteractionMain.`, 'color: green; font-weight: bold;');
                // Stop polling if it was somehow still running
                if (checkIntervalId) { clearInterval(checkIntervalId); checkIntervalId = null; console.log(`${PLUGIN_NAME}: Polling stopped due to successful init.`); }
            } else { console.error(`${PLUGIN_NAME}: Lampa.InteractionMain is not a function at final init time! Cannot wrap.`); }
        } catch (e) { console.error(`${PLUGIN_NAME}: CRITICAL Error during initPlugin execution:`, e); }
    }

    // Polling check function triggered by setInterval after activity_ready
    function performCheck(activity) {
        // Stop checking if plugin already initialized successfully
        if (pluginInitializationSucceeded) { if (checkIntervalId) clearInterval(checkIntervalId); checkIntervalId = null; return; }

        checkAttempts++;
        console.debug(`${PLUGIN_NAME}: Polling check #${checkAttempts}/${MAX_CHECK_ATTEMPTS}...`);

        try {
            // Check if activity and render method exist
            if (activity && typeof activity.render === 'function') {
                const activityRendered = activity.render();
                if (activityRendered) {
                    // Check for the target element
                    const targetElementFound = activityRendered.find(TARGET_INFO_ELEMENT_SELECTOR).length > 0;
                    console.debug(`${PLUGIN_NAME}: Polling DOM check: Target element (${TARGET_INFO_ELEMENT_SELECTOR}) found = ${targetElementFound}`);
                    if (targetElementFound) {
                        console.log(`%c${PLUGIN_NAME}: Target element FOUND via polling check, calling initPlugin().`, 'color: green');
                        if (checkIntervalId) clearInterval(checkIntervalId); // Stop polling
                        checkIntervalId = null;
                        initPlugin(); // Found it! Initialize the wrapping.
                        return; // Exit check loop
                    }
                } else { console.warn(`${PLUGIN_NAME}: Polling check: activity.render() returned null/undefined.`); }
            } else { console.warn(`${PLUGIN_NAME}: Polling check: activity object or render method missing.`); }
        } catch(e) {
            console.error(`${PLUGIN_NAME}: Error during polling check:`, e);
            if (checkIntervalId) clearInterval(checkIntervalId); // Stop polling on error
            checkIntervalId = null;
            return;
        }

        // Stop if max attempts reached
        if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
            console.warn(`${PLUGIN_NAME}: Max polling attempts (${MAX_CHECK_ATTEMPTS}) reached for this activity instance without finding target element.`);
            if (checkIntervalId) clearInterval(checkIntervalId);
            checkIntervalId = null;
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded. Waiting for Lampa app ready...`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS(); // Inject CSS on app ready

            // Listen for activities becoming ready to START the polling check
            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                 console.log(`%c${PLUGIN_NAME}: Activity ready event received. Init Status: {Succeeded: ${pluginInitializationSucceeded}}.`, 'color: magenta');
                 if (pluginInitializationSucceeded) return; // Don't start new polling if already done

                 try {
                     // Clear any previous interval (important if activities change quickly)
                     if (checkIntervalId) {
                         console.debug(`${PLUGIN_NAME}: Clearing previous check interval.`);
                         clearInterval(checkIntervalId);
                         checkIntervalId = null;
                     }
                     checkAttempts = 0; // Reset attempt counter for this activity instance

                     const currentActivity = activityEvent.activity;
                     if (currentActivity) {
                         console.log(`${PLUGIN_NAME}: Starting polling check sequence (Max ${MAX_CHECK_ATTEMPTS} attempts @ ${CHECK_INTERVAL_MS}ms interval)...`);
                         // Start polling check interval
                         checkIntervalId = setInterval(() => performCheck(currentActivity), CHECK_INTERVAL_MS);
                         // Perform first check slightly deferred (yield)
                         setTimeout(() => performCheck(currentActivity), 0);
                     } else {
                          console.warn(`${PLUGIN_NAME}: No valid activity object found in activity_ready event.`);
                     }
                 } catch (error) {
                    console.error(`${PLUGIN_NAME}: Error setting up polling in activity_ready listener:`, error);
                 }
            });
        }
    });

    // Add language string potentially needed (safe check)
    if (window.Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(window);
