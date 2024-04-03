/******************************************************************\
Please read this description on how to make it work.

To be used with MidiQOL / DAE / Times-up / Warpgate (/ItemMacro optional)

Create a Feature and a DAE on it.
The DAE should have the following option checked: Transfer to actor on item equip.
The option is under the Details tab of the DAE.

In the DAE Effects tab of the same feature, create an entry as follows:
flags.midi-qol.onUseMacroName | Custom | ItemMacro,postActiveEffects

If you want to use a macro in your macro folder instead of an ItemMacro just use 
the name of that script macro you created instead of call ItemMacro.
If named Crusher123 use
flags.midi-qol.onUseMacroName | Custom | Crusher123,postActiveEffects

Depending on your Warpgate settings, the final step might be asking for the GM
to accept the mutation, if it is triggered by a player's client. 
\******************************************************************/

//Actual macro\\

if (
	!args[0].hitTargets ||
	!args[0].damageDetail.some((i) => i.type === 'bludgeoning')
)
	return;

const tactor = args[0].hitTargets[0].actor;
if (args[0].isCritical) await applyTargetGAdvantageEffect();
let combatTime;
if (game.combat) {
	combatTime = `${game.combat.id} - 100*${game.combat.round} + ${game.combat.turn}`;
	const lastTime = actor.getFlag('world', 'CrusherUsed');
	if (combatTime === lastTime) return;
}

const dialog = new Promise((resolve, reject) => {
	new Dialog({
		title: 'Crusher Feat: move target 5ft',
		content:
			'Do you want to move the target 5ft to a direction of your choice?',
		buttons: {
			one: {
				icon: '<i class="fas fa-check"></i>',
				label: 'Yes',
				callback: () => resolve(true),
			},
			two: {
				icon: '<i class="fas fa-times"></i>',
				label: 'No',
				callback: () => {
					resolve(false);
				},
			},
		},
		default: 'two',
	}).render(true);
});
const result = await dialog;
if (result) applyTargetMove(combatTime);
else return;

async function applyTargetGAdvantageEffect() {
	const effect_sourceData = {
		changes: [
			{
				key: 'flags.midi-qol.grants.advantage.attack.all',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 1,
				priority: 20,
			},
		],
		origin: args[0].itemUuid,
		duration: game.combat
			? {
					rounds: 1,
					turns: 0,
					startRound: `${game.combat.round}`,
					startTurn: `${game.combat.turn}`,
					startTime: `${game.time.worldTime}`,
			  }
			: { seconds: 6, startTime: `${game.time.worldTime}` },
		icon: 'icons/skills/melee/strike-hammer-destructive-orange.webp',
		name: 'Crusher feat - Grant Advantage on all attacks',
		flags: { dae: { specialDuration: ['turnStartSource'] } },
	};
	const hasEffect = tactor.appliedEffects.find(
		(i) => i.name === 'Crusher feat - Grant Advantage on all attacks'
	);
	if (hasEffect)
		await MidiQOL.socket().executeAsGM('removeEffects', {
			actorUuid: args[0].hitTargetUuids[0],
			effects: [hasEffect.id],
		});
	await MidiQOL.socket().executeAsGM('createEffects', {
		actorUuid: args[0].hitTargetUuids[0],
		effects: [effect_sourceData],
	});
}

async function applyTargetMove(time) {
	const targetDoc = args[0].hitTargets[0];
	const targetToken = targetDoc.object;
	const targetCenter = targetToken.center;
	const maxRange = 5;
	let distance = 0;
	let ray;
	const checkDistance = async (crosshairs) => {
		while (crosshairs.inFlight) {
			await warpgate.wait(100);
			ray = new Ray(targetCenter, crosshairs);
			distance = canvas.grid.measureDistances([{ ray }], {
				gridSpaces: true,
			})[0];
			if (
				canvas.grid.isNeighbor(
					ray.A.x / canvas.grid.w,
					ray.A.y / canvas.grid.w,
					ray.B.x / canvas.grid.w,
					ray.B.y / canvas.grid.w
				) === false ||
				canvas.scene.tokens.some(
					(i) => i.object.center.x === ray.B.x && i.object.center.y === ray.B.y
				)
			) {
				crosshairs.icon = 'icons/svg/hazard.svg';
			} else {
				crosshairs.icon = targetDoc.texture.src;
			}
			crosshairs.draw();
			crosshairs.label = `${distance}/${maxRange} ft`;
		}
	};
	const callbacks = {
		show: checkDistance,
	};
	let distanceCheck = await warpgate.crosshairs.show(
		{
			size: targetDoc.width,
			icon: targetDoc.texture.src,
			label: '0 ft.',
			interval: -1,
		},
		callbacks
	);

	while (
		canvas.scene.tokens.some(
			(tok) =>
				(tok !== targetToken &&
					tok.object.center.x === ray.B.x &&
					tok.object.center.y === ray.B.y) ||
				distance > 5
		)
	) {
		ui.notifications.warn(
			`Crusher Feat: Cannot move ${targetDoc.name} on top of another token or further than 5ft away`
		);
		distanceCheck = await warpgate.crosshairs.show(
			{
				size: targetDoc.width,
				icon: targetDoc.texture.src,
				label: '0 ft.',
				interval: -1,
			},
			callbacks
		);
		let { cancelled } = distanceCheck;
		if (cancelled) return;
	}
	const { x, y, cancelled } = distanceCheck;
	if (cancelled) return;
	const newCenter = canvas.grid.getSnappedPosition(
		x - targetToken.w / 2,
		y - targetToken.h / 2,
		1
	);
	await MidiQOL.moveToken(targetDoc.uuid, newCenter, true);
	if (game.combat) await actor.setFlag('world', 'CrusherUsed', `${time}`);
	else if (!game.combat && actor.getFlag('world', 'CrusherUsed'))
		await actor.unsetFlag('world', 'CrusherUsed');
}
