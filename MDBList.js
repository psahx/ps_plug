// == Lampa Plugin: Interface Patcher - Step 2.1 ==
// Purpose: Test Replacement Mechanism. Replaces InteractionMain with a factory
//          that checks conditions but always returns the ORIGINAL component instance.
// Strategy: Poll flag, replace InteractionMain with test factory. NO PATCHING.
// Version: 2.1 (Replacement Test)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 2.1 (Replacement Test)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step2'; // New ID for clarity
    const POLLING_INTERVAL_MS = 250;
    const MAX_POLLING_ATTEMPTS = 60;

    // --- CSS Injection Function ---
    function injectCSS() {
        if (!window.Lampa || !Lampa.Template || !window.$) { console.error(`${PLUGIN_NAME}: CSS Inject FAIL - Lampa/$ not ready.`); return; }
        console.log(`${PLUGIN_NAME}: Attempt CSS inject (Style ID: ${STYLE_ID})...`);
        try {
            // Ensure previous styles potentially added by earlier test versions are removed
            $('style[data-id^="patched_new_interface_style_step"]').remove();

            if ($('style[data-id="' + STYLE_ID + '"]').length) { console.log(`${PLUGIN_NAME}: CSS already injected.`); return; }
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content as provided before ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css); $('body').append(Lampa.Template.get(STYLE_ID, {}, !0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }

    // --- Factory Replacement Logic ---
    let originalInteractionMainFactory = null; // Stores the original/CUB factory
    let pluginInitializationSucceeded = false; // Track if replacement succeeded
    let pollingIntervalId = null;
    let pollingAttempts = 0;

    // ** Factory function that WILL replace Lampa.InteractionMain **
    function ourReplacementFactory(object) {
        // Note: arguments object captures all args passed by Lampa
        console.log(`${PLUGIN_NAME}: Replacement Factory called for source:`, object?.source);
        let instance = null;
        let conditionsMet = false;

        // Perform condition check FIRST
        try {
             conditionsMet = (object.source == 'tmdb' || object.source == 'cub') &&
                             (window.innerWidth >= 767) &&
                             Lampa.Account.hasPremium() &&
                             (Lampa.Manifest.app_digital >= 153);
             console.log(`${PLUGIN_NAME}: Factory condition check result: ${conditionsMet}`);
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error during condition checks in factory`, e);
            conditionsMet = false; // Fail safe
        }

        // Ensure we have the original factory captured before trying to use it
        if (!originalInteractionMainFactory) {
             console.error(`${PLUGIN_NAME}: Original factory not captured! Cannot create component instance.`);
             return null; // Cannot proceed
        }

        // ** STEP 2.1: Always call the ORIGINAL factory for this test **
        try {
            if (conditionsMet) {
                 console.warn(`%c${PLUGIN_NAME}: Conditions Met. Would use MODIFIED component [STEP 2.1 - Returning ORIGINAL for test].`, 'color: orange;');
            } else {
                 console.log(`${PLUGIN_NAME}: Conditions NOT Met. Returning ORIGINAL component.`);
            }
            // Call original factory using apply to preserve context/args
            // 'this' refers to the context Lampa called ourReplacementFactory with
            instance = originalInteractionMainFactory.apply(this, arguments);
            console.log(`${PLUGIN_NAME}: Replacement Factory: Original factory returned instance:`, !!instance);
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Replacement Factory: Error calling original factory`, e);
            // instance will likely be null or undefined here
        }

        return instance; // Return the instance created by the original factory
    }

    // Core initialization function (captures original, replaces with ourReplacementFactory)
    function initPlugin() {
        if (pluginInitializationSucceeded) { return; }
        console.log(`${PLUGIN_NAME}: initPlugin() called. Attempting factory replacement...`);
        try {
            if (typeof Lampa.InteractionMain === 'function') {
                originalInteractionMainFactory = Lampa.InteractionMain; // Capture original/CUB factory
                Lampa.InteractionMain = ourReplacementFactory; // Replace with our test factory
                pluginInitializationSucceeded = true;
                console.log(`%c${PLUGIN_NAME}: Successfully captured original and replaced Lampa.InteractionMain with test factory.`, 'color: green; font-weight: bold;');
            } else {
                console.error(`${PLUGIN_NAME}: Lampa.InteractionMain is not a function at init time! Cannot replace.`);
            }
        } catch (e) {
             console.error(`${PLUGIN_NAME}: CRITICAL Error during initPlugin execution:`, e);
        } finally {
            // Stop polling once initPlugin is attempted, regardless of success
            if (pollingIntervalId) {
                 clearInterval(pollingIntervalId);
                 pollingIntervalId = null;
                 console.log(`${PLUGIN_NAME}: Polling stopped after initPlugin attempt.`);
            }
        }
    }

    // Polling function to check for the CUB interface flag - unchanged
    function checkFlagAndInit() {
        if (pluginInitializationSucceeded) { if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null; return; }
        pollingAttempts++;
        if (window.plugin_interface_ready === true) {
            console.log(`%c${PLUGIN_NAME}: Flag detected! (Attempt #${pollingAttempts}). Calling initPlugin().`, 'color: green');
            if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null;
            initPlugin();
        } else if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            console.warn(`${PLUGIN_NAME}: Max polling attempts reached. Replacement will not occur.`);
            if (pollingIntervalId) clearInterval(pollingIntervalId); pollingIntervalId = null;
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS();
            // Start polling - unchanged
            if (pollingIntervalId) clearInterval(pollingIntervalId); pollingAttempts = 0;
            console.log(`${PLUGIN_NAME}: Starting polling for flag 'window.plugin_interface_ready'...`);
            checkFlagAndInit();
            if (!pluginInitializationSucceeded && !pollingIntervalId) { pollingIntervalId = setInterval(checkFlagAndInit, POLLING_INTERVAL_MS); }
        }
    });

    // Add language string if needed
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})();
