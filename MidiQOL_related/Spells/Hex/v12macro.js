/* HOW TO
MidiQOL on Use ItemMacro, All or macroName, All.

It will adjust the duration based on spell slot used.
If the target drops to 0 hit points before the spell ends, target a new creature and recast.
The duration left will be respected and no more spell slots or uses will be consumed.
*/

if (workflow.macroPass === "DamageBonus") {
    if (workflow.hitTargets.size) {
        const mark = actor.getFlag('world', 'hexTarget');
        if (mark === workflow.hitTargets.first.document.uuid){
            const dmgOptions = workflow.damageRolls?.[0].options ? duplicate(workflow.damageRolls[0].options) : {};
            dmgOptions.critical = workflow.isCritical;
            delete dmgOptions.configured;
            dmgOptions.flavor = 'Hex Damage';
            const damageBonusResult = new CONFIG.Dice.DamageRoll("1d6[necrotic]", args[0].rollData, dmgOptions);
            return damageBonusResult;
        }
    }
    return {};
} else if (workflow.macroPass === "postActiveEffects"){
    if (!args[0].hitTargetUuids.length) return ui.notifications.warn("Please select a bugbear!")
    const effect = actor.appliedEffects.find(effect => effect.name == item.name);
    let stat;
    let duration;
    if (effect) {
        stat = actor.getFlag("world", "hexStat");
        const previousTargetUuid = actor.getFlag("world", "hexTarget");
        duration = effect.duration;
        await chooseAbilityTarget(stat,duration);
        const changes = foundry.utils.duplicate(effect.changes);
        changes[1].value = args[0].hitTargetUuids[0];
        if (!previousTargetUuid) return await effect.update({changes});
        const previousToken = foundry.utils.fromUuidSync(previousTargetUuid);
        if (!previousToken) return effect.update({changes});
        await actor.updateEmbeddedDocuments("ActiveEffect", [{"_id":effect.id, duration, changes}]);
        const previousEffectId = previousToken.actor.appliedEffects.find(eff=>eff.name === item.name+" Marked")?.id;
        return MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: previousToken.actor.uuid, effects: [previousEffectId] });
    }
    const mainDialog = await new Promise((resolve, reject) => {
        let d = new Dialog({
            title: `Hex's disadvantage on ability checks. Choose one.`,
            buttons: Object.entries(CONFIG.DND5E.abilities).map(i=>({label:i[1].label, callback: (html) => {
                         results = i[1].abbreviation;
                         resolve(results);
                     }})),
            default: "Strength"        
            }).render(true,{width: "auto",height: "auto",resizable: true,id:"Hex"})
    });
    stat = await mainDialog;
    const {spellLevel} = args[0];
    const worldTime = game.time.worldTime;
    duration = spellLevel < 3 ? { seconds: 3600, startTime: worldTime } : spellLevel < 5 ? { seconds: 28800, startTime: worldTime } : { seconds: 86400, startTime: worldTime }
    await chooseAbilityTarget(stat,duration);
    const effectData = {
        "name": item.name,
        "icon": item.img,
        "changes": [
            { "key": "flags.dnd5e.DamageBonusMacro", "value": `ItemMacro.${item.name}`, "mode": CONST.ACTIVE_EFFECT_MODES.CUSTOM, "priority": 20 },
            { "key": "flags.world.hexTarget", "value": args[0].hitTargetUuids[0], "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "priority": 20 },
            { "key": "flags.world.hexStat", "value": stat, "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "priority": 20 },
            { "key": "macro.itemMacro", "value": "", "mode": CONST.ACTIVE_EFFECT_MODES.CUSTOM, "priority": 20 }
        ],
        "duration": duration,
        "origin": item.uuid
    }
    const concentrationEffect = MidiQOL.getConcentrationEffect(token.actor);
    await actor.updateEmbeddedDocuments("ActiveEffect", [{"_id":concentrationEffect.id, duration}]);
    await actor.items.getName(item.name)?.update({"system.components.concentration":false})
    return actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}
else if (workflow.macroPass === "preItemRoll") {
    const mark = actor.getFlag('world', 'hexTarget');
    if (!mark) return;
    const markToken = fromUuidSync(mark);
    if (!markToken) return;
    const markActor = markToken.actor;
    if (markActor.system.attributes.hp.value !== 0) return;
    else {
        workflow.options.configureDialog = false;
        workflow.config.consumeUsage = null;
        workflow.config.consumeResource = null;
        workflow.config.consumeSpellSlot = null;
    }
}
else if (args[0] === "off") {
    const item = fromUuidSync(lastArgValue.origin);
    const markToken = fromUuidSync(lastArgValue.efData.changes[1].value);
    const effect = markToken.actor.appliedEffects.find(eff=>eff.name === item.name+" Marked");
    if (effect) await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: markToken.actor.uuid, effects: [effect.id] });
    await item?.update({"system.components.concentration":true});
}

async function chooseAbilityTarget(stat,duration) {
    const effect_targetData = {
        "changes": [{ "key": `flags.midi-qol.disadvantage.ability.check.${stat}`, "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "value": 1, "priority": 20 }],
        "origin": item.uuid, //flag the effect as associated to the spell being cast
        "duration": duration,
        "icon": item.img,
        "name": item.name+" Marked"
    }
    await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: game.user.targets.first().actor.uuid, effects: [effect_targetData] });
}
