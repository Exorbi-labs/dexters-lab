"use client";

import { useState } from "react";
import {
  uid,
  ROLES,
  roleLabel,
  accentForIndex,
  initialsFrom,
  type Member,
  type Role,
  type Task,
} from "@/lib/model";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { usePresence } from "@/lib/presence";
import {
  PageHeader,
  Card,
  Chip,
  PillButton,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  Add01Icon,
  Tick02Icon,
  Cancel01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export default function TeamPage() {
  const [members, setMembers, loaded] = usePersistentState<Member[]>(
    STORE_KEYS.members,
    [],
  );
  const [tasks] = usePersistentState<Task[]>(STORE_KEYS.tasks, []);
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);
  const online = usePresence();

  const [composing, setComposing] = useState(false);

  const openTasksFor = (id: string) =>
    tasks.filter((t) => t.assigneeId === id && t.status !== "done").length;

  const rolesRepresented = new Set(members.map((m) => m.role)).size;

  const addMember = (name: string, email: string, role: Role) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const member: Member = {
      id: uid(),
      name: trimmed,
      initials: initialsFrom(trimmed),
      role,
      accent: accentForIndex(members.length),
      email: email.trim() || undefined,
      joinedAt: Date.now(),
    };
    setMembers((prev) => [...prev, member]);
    if (member.email) {
      // email them a sign-in link — no-op when SMTP isn't configured
      void fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [member.email] }),
      }).catch(() => {});
    }
    setComposing(false);
  };

  const updateMember = (id: string, patch: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...patch,
              initials: patch.name ? initialsFrom(patch.name) : m.initials,
            }
          : m,
      ),
    );
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        microcopy="who's in the lab"
        title="Team"
        actions={
          <PillButton
            variant="ink"
            onClick={() => setComposing((v) => !v)}
          >
            <Icon icon={composing ? Cancel01Icon : Add01Icon} size={15} />
            {composing ? "Close" : "Invite member"}
          </PillButton>
        }
      />

      {composing && (
        <Composer
          onSave={addMember}
          onCancel={() => setComposing(false)}
        />
      )}

      {loaded && members.length > 0 && (
        <p className="microlabel text-ink-faint">
          {members.length} {members.length === 1 ? "member" : "members"} ·{" "}
          {rolesRepresented} {rolesRepresented === 1 ? "role" : "roles"}{" "}
          represented
        </p>
      )}

      {loaded && members.length === 0 && !composing && (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon icon={UserGroupIcon} size={26} />
          </span>
          <p className="text-ink-muted font-normal">
            Your lab is empty — add the first teammate.
          </p>
          <PillButton variant="ink" onClick={() => setComposing(true)}>
            <Icon icon={Add01Icon} size={15} />
            Invite member
          </PillButton>
        </Card>
      )}

      {members.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              isMe={m.id === meId}
              isOnline={online.has(m.id)}
              openTasks={openTasksFor(m.id)}
              onUpdate={(patch) => updateMember(m.id, patch)}
              onRemove={() => removeMember(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({
  onSave,
  onCancel,
}: {
  onSave: (name: string, email: string, role: Role) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("engineer");

  return (
    <Card className="space-y-4">
      <p className="microlabel text-ink-faint">new teammate</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
      </div>
      <p className="microlabel text-ink-faint">
        ADDING AN EMAIL SENDS THEM A SIGN-IN INVITE — THEY CLAIM THIS PROFILE
        THE MOMENT THEY SIGN IN WITH GOOGLE
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-normal text-ink outline-none focus:border-accent"
        >
          {ROLES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <PillButton variant="ghost" onClick={onCancel}>
            <Icon icon={Cancel01Icon} size={15} />
            Cancel
          </PillButton>
          <PillButton
            variant="ink"
            onClick={() => onSave(name, email, role)}
            disabled={!name.trim()}
          >
            <Icon icon={Tick02Icon} size={15} />
            Add member
          </PillButton>
        </div>
      </div>
    </Card>
  );
}

function MemberCard({
  member,
  isMe,
  isOnline,
  openTasks,
  onUpdate,
  onRemove,
}: {
  member: Member;
  isMe: boolean;
  isOnline: boolean;
  openTasks: number;
  onUpdate: (patch: Partial<Member>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email ?? "");
  const [role, setRole] = useState<Role>(member.role);

  const save = () => {
    if (!name.trim()) return;
    onUpdate({ name: name.trim(), email: email.trim() || undefined, role });
    setEditing(false);
  };

  const cancel = () => {
    setName(member.name);
    setEmail(member.email ?? "");
    setRole(member.role);
    setEditing(false);
  };

  if (editing) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar
            initials={initialsFrom(name || member.name)}
            accent={member.accent}
            size={44}
          />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-accent"
          />
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-accent"
        >
          {ROLES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-end gap-2 pt-1">
          <PillButton variant="ghost" onClick={cancel}>
            <Icon icon={Cancel01Icon} size={14} />
            Cancel
          </PillButton>
          <PillButton variant="ink" onClick={save} disabled={!name.trim()}>
            <Icon icon={Tick02Icon} size={14} />
            Save
          </PillButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="relative inline-flex">
          <Avatar initials={member.initials} accent={member.accent} size={44} />
          {isOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
              style={{ background: "#3FA88F" }}
              title="online now"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-normal text-ink">{member.name}</p>
            {isMe && <Chip tone="accent">you</Chip>}
          </div>
          {member.email && (
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              {member.email}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip>{roleLabel(member.role)}</Chip>
        {openTasks > 0 && (
          <span className="microlabel text-ink-faint">{openTasks} open</span>
        )}
      </div>

      <div className="flex items-center gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <Icon icon={PencilEdit02Icon} size={14} />
          <span className="microlabel">Edit</span>
        </button>
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <Icon icon={Delete02Icon} size={14} />
          <span className="microlabel">Remove</span>
        </button>
      </div>
    </Card>
  );
}
