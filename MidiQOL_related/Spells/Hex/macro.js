/* HOW TO
MidiQOL on Use ItemMacro, All or macroName, All.

It will adjust the duration based on spell slot used.
If the target drops to 0 hit points before the spell ends, target a new creature and recast.
The duration left will be respected and no more spell slots or uses will be consumed.
*/

if (args[0].macroPass === "DamageBonus") { //this part is reused from @Wolfe#4517 Hex macro
    if (args[0].hitTargets.length > 0) {
        const mark = token.actor.getFlag('world', 'hexTarget');
        if (mark === args[0].hitTargetUuids[0]){
            const dmgOptions = args[0].damageRoll?.options ? duplicate(args[0].damageRoll.options) : {};
            dmgOptions.critical = args[0].isCritical;
            delete dmgOptions.configured;
            delete dmgOptions.flavor;
            const damageBonusResult = new CONFIG.Dice.DamageRoll("1d6[necrotic]", args[0].rollData, dmgOptions);
            return {damageRoll: damageBonusResult.formula, flavor: 'Hex Damage'};
        }
    }
    return {};
} else if (args[0].macroPass === "postActiveEffects"){
    if (!args[0].hitTargetUuids.length) return ui.notifications.warn("Please select a bugbear!")
    const effect = token.actor.effects.find(e => e.label === `${args[0].item.name}`);
    let stat;
    let duration;
    if (effect) {
        stat = token.actor.getFlag("world", "hexStat");
        const previousTargetUuid = token.actor.getFlag("world", "hexTarget");
        duration = effect.duration;
        await chooseAbilityTarget(stat,duration);
        let changes = foundry.utils.duplicate(effect.changes);
        changes[1] = { "key": "flags.world.hexTarget", "value": args[0].hitTargetUuids[0], "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "priority": 20 };
        if (!previousTargetUuid) return await effect.update({changes});
        const previousToken = fromUuidSync(previousTargetUuid);
        if (!previousToken) return await effect.update({changes});
        await token.actor.updateEmbeddedDocuments("ActiveEffect", [{"_id":effect.id, duration, changes}]);
        const previousEffectId = previousToken.actor.effects.find(eff=>eff.label === args[0].item.name+" Marked")?.id;
        return await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: previousToken.actor.uuid, effects: [previousEffectId] });
    }
    const mainDialog = await new Promise((resolve, reject) => {
        let d = new Dialog({
            title: `Hex's disadvantage on ability checks. Choose one.`,
            buttons: Object.entries(CONFIG.DND5E.abilities).map(i=>({label:i[1], callback: (html) => {
                         results = i[0];
                         resolve(results);
                     }})),
            default: "Strength"        
            }).render(true,{width: "auto",height: "auto",resizable: true,id:"Hex"})
    });
    stat = await mainDialog;
    duration = args[0].spellLevel < 3 ? { seconds: 3600, startTime: `${game.time.worldTime}` } : args[0].spellLevel < 5 ? { seconds: 28800, startTime: `${game.time.worldTime}` } : { seconds: 86400, startTime: `${game.time.worldTime}` }
    await chooseAbilityTarget(stat,duration);
    const effectData = {
        "label": `${args[0].item.name}`,
        "icon": args[0].item.img,
        "changes": [
            { "key": "flags.dnd5e.DamageBonusMacro", "value": `ItemMacro.${args[0].item.name}`, "mode": CONST.ACTIVE_EFFECT_MODES.CUSTOM, "priority": 20 },
            { "key": "flags.world.hexTarget", "value": args[0].hitTargetUuids[0], "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "priority": 20 },
            { "key": "flags.world.hexStat", "value": stat, "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "priority": 20 },
            { "key": "macro.itemMacro", "value": "", "mode": CONST.ACTIVE_EFFECT_MODES.CUSTOM, "priority": 20 }
        ],
        "duration": duration,
        "origin": args[0].item.uuid
    }
    const concentrationEffect = token.actor.effects.find(e => e.label === "Concentrating");
    await token.actor.updateEmbeddedDocuments("ActiveEffect", [{"_id":concentrationEffect.id, duration}]);
    await token.actor.items.getName(args[0].item.name)?.update({"system.components.concentration":false})
    return await token.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}
else if (args[0].macroPass === "preItemRoll") {
    const mark = token.actor.getFlag('world', 'hexTarget');
    if (!mark) return;
    const markToken = fromUuidSync(mark);
    if (!markToken) return;
    const markActor = markToken.actor;
    if (markActor.system.attributes.hp.value !== 0) return;
    else {
        this.options.configureDialog = false;
        this.config.consumeUsage = false;
        this.config.needsConfiguration = false;
        this.config.consumeQuantity = false;
        this.config.consumeRecharge = false;
        this.config.consumeSpellLevel = false;
        this.config.consumeResource = false;
        this.config.consumeSpellSlot = false;
    }
}
else if (args[0] === "off") {
    const item = fromUuidSync(args.at(-1).origin);
    const markToken = fromUuidSync(args.at(-1).efData.changes[1].value);
    const effect = markToken.actor.effects.find(eff=>eff.label === item.name+" Marked");
    await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: markToken.actor.uuid, effects: [effect.id] });
    await item?.update({"system.components.concentration":true});
}

async function chooseAbilityTarget(stat,duration) {
    const effect_targetData = {
        "changes": [{ "key": `flags.midi-qol.disadvantage.ability.check.${stat}`, "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "value": 1, "priority": 20 }],
        "origin": args[0].itemUuid, //flag the effect as associated to the spell being cast
        "duration": duration,
        "icon": args[0].item.img,
        "label": args[0].item.name+" Marked"
    }
    await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: game.user.targets.first().document.uuid, effects: [effect_targetData] });
}
