export function getRenderedApplications() {
  const registry = foundry.applications?.instances;
  if (registry?.values) return Array.from(registry.values());

  const instances = foundry.applications?.api?.ApplicationV2?.instances;
  if (typeof instances === "function") return Array.from(instances.call(foundry.applications.api.ApplicationV2));
  if (instances?.values) return Array.from(instances.values());
  if (instances?.[Symbol.iterator]) return Array.from(instances);

  return [];
}

export function canModifyDocument(document) {
  try {
    const user = game.user;
    if (!document || !user) return false;
    if (user.isGM || document.isOwner) return true;
    if (document.canUserModify?.(user, "update")) return true;

    const ownerLevel = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? "OWNER";
    if (document.testUserPermission?.(user, ownerLevel)) return true;

    const assistantRole = globalThis.CONST?.USER_ROLES?.ASSISTANT ?? "ASSISTANT";
    return Boolean(user.hasRole?.(assistantRole));
  } catch (_) {
    return Boolean(document?.isOwner);
  }
}

export async function fromUuidCompat(uuid) {
  if (!uuid) return null;
  const resolver = foundry.utils?.fromUuid ?? globalThis.fromUuid;
  return typeof resolver === "function" ? resolver(uuid) : null;
}

function getEquippedArmor(actor) {
  return (
    actor?.system?.armor ??
    actor?.items?.find?.((item) => item.type === "armor" && item.system?.equipped) ??
    null
  );
}

export function getActorArmorData(actor) {
  try {
    const score = actor?.system?.armorScore;
    const scoreIsObject = score && typeof score === "object";
    const armorItem = getEquippedArmor(actor);
    const armorSystem = armorItem?.system?.armor;

    const max = Number(
      (scoreIsObject ? score.max : score) ??
        armorSystem?.max ??
        armorItem?.system?.baseScore ??
        0
    );
    const marks = Number(
      (scoreIsObject ? score.value : undefined) ??
        armorSystem?.current ??
        armorItem?.system?.marks?.value ??
        0
    );

    const safeMax = Number.isFinite(max) ? max : 0;
    const safeMarks = Number.isFinite(marks) ? marks : 0;

    return {
      hasArmor: safeMax > 0,
      marks: Math.max(0, Math.min(safeMarks, safeMax)),
      max: safeMax,
      uuid: armorItem?.uuid ?? null,
      item: armorItem,
    };
  } catch (_) {
    return { hasArmor: false, marks: 0, max: 0, uuid: null, item: null };
  }
}

export async function setActorArmorValue(actor, nextValue, itemUuid = null) {
  const current = getActorArmorData(actor);
  if (!actor || !current.hasArmor) return false;

  const next = Math.max(0, Math.min(Number(nextValue) || 0, current.max));
  if (next === current.marks) return true;

  if (typeof actor.system?.updateArmorValue === "function") {
    await actor.system.updateArmorValue({ value: next - current.marks });
    return true;
  }

  const armorItem = itemUuid ? await fromUuidCompat(itemUuid) : current.item;
  if (!armorItem) return false;

  if (armorItem.system?.armor) {
    await armorItem.update({ "system.armor.current": next });
  } else {
    await armorItem.update({ "system.marks.value": next });
  }
  return true;
}

export async function toggleActorArmorSlot(actor, clickedValue, itemUuid = null) {
  const armor = getActorArmorData(actor);
  if (!armor.hasArmor) return false;

  const value = Number(clickedValue) || 0;
  if (!value) return false;

  const next = value <= armor.marks ? value - 1 : value;
  return setActorArmorValue(actor, next, itemUuid);
}
