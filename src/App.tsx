import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ayperatudomuodlitivh.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGVyYXR1ZG9tdW9kbGl0aXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjI2MDgsImV4cCI6MjA4OTQzODYwOH0.YOZn_K0iXiA0hTIAC3XZFn3Rr2UMTV6JZT-L_C2dn8o';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}
interface League {
  id: number;
  name: string;
  season: string | null;
  created_by: string;
}
interface Member {
  id: number;
  league_id: number;
  player_id: string;
  wins: number;
  losses: number;
  points: number;
  matches_played: number;
}
interface Match {
  id: number;
  league_id: number;
  player1_id: string;
  player2_id: string;
  score1: number | null;
  score2: number | null;
  played: boolean;
  match_date: string | null;
  cup_id?: number;
}
interface Cup {
  id: number;
  name: string;
  league_id: number;
  created_by: string;
}
interface CupMatch {
  id: number;
  cup_id: number;
  round_name: string;
  round_order: number;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  score1: number | null;
  score2: number | null;
  played: boolean;
}
interface ToastState {
  msg: string;
  type: string;
}

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0d0d',
  card: '#111',
  border: '#222',
  accent: '#c8ff00',
  text: '#fff',
  muted: '#888',
  danger: '#f87171',
  success: '#4ade80',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; color: #fff; font-family: 'DM Sans', system-ui, sans-serif; }
  input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #111; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  input[type=number]::-webkit-inner-spin-button { opacity: 1; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return (
    name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}
function calcPoints(scoreW: number, scoreL: number) {
  if (scoreW >= 10 && scoreL >= 10 && scoreW === scoreL + 2)
    return { winnerPts: 2, loserPts: 1 };
  if (scoreW === 11 && scoreL < 10) return { winnerPts: 3, loserPts: 0 };
  return { winnerPts: 3, loserPts: 0 };
}

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────
function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2px solid #333',
        borderTop: `2px solid ${C.accent}`,
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
        display: 'inline-block',
      }}
    />
  );
}

function Avatar({
  profile,
  size = 40,
}: {
  profile?: Profile | null;
  size?: number;
}) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: `2px solid ${C.accent}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#c8ff00,#7bba00)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.36,
        color: '#111',
        border: `2px solid ${C.accent}`,
        flexShrink: 0,
      }}
    >
      {getInitials(profile?.full_name)}
    </div>
  );
}

function Btn({
  children,
  variant = 'primary',
  loading,
  style: s,
  ...rest
}: {
  children: React.ReactNode;
  variant?: string;
  loading?: boolean;
  style?: React.CSSProperties;
  [k: string]: any;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: C.accent, color: '#111', border: 'none' },
    ghost: {
      background: 'transparent',
      color: C.accent,
      border: `1px solid ${C.accent}`,
    },
    danger: {
      background: 'transparent',
      color: C.danger,
      border: `1px solid ${C.danger}`,
    },
    dark: {
      background: '#1a1a1a',
      color: C.text,
      border: `1px solid ${C.border}`,
    },
  };
  return (
    <button
      disabled={loading || rest.disabled}
      {...rest}
      style={{
        padding: '9px 18px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        letterSpacing: 0.5,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'opacity .15s',
        opacity: loading ? 0.5 : 1,
        ...(styles[variant] || styles.primary),
        ...s,
      }}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

function Input({
  label,
  error,
  ...props
}: {
  label?: string;
  error?: string;
  [k: string]: any;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 11,
            color: C.muted,
            marginBottom: 5,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: '100%',
          background: '#0d0d0d',
          border: `1px solid ${error ? C.danger : C.border}`,
          borderRadius: 8,
          padding: '10px 12px',
          color: C.text,
          fontSize: 14,
          outline: 'none',
          ...props.style,
        }}
      />
      {error && (
        <div style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeIn .2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 22,
          }}
        >
          <h3
            style={{
              color: C.accent,
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 20,
              letterSpacing: 1,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: C.muted,
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type = 'success' }: { msg: string; type?: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#2a1111' : '#112a11',
        border: `1px solid ${type === 'error' ? C.danger : C.success}`,
        color: type === 'error' ? C.danger : C.success,
        borderRadius: 10,
        padding: '12px 20px',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 2000,
        animation: 'fadeIn .2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'error' ? '❌' : '✅'} {msg}
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }: { onAuth: (u: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSubmit() {
    setError('');
    setInfo('');
    if (!email || !password) return setError('Wypełnij wszystkie pola.');
    if (mode === 'register' && !fullName.trim())
      return setError('Podaj imię i nazwisko.');
    setLoading(true);
    if (mode === 'register') {
      const { error: e } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (e) setError(e.message);
      else setInfo('Sprawdź e-mail i kliknij link aktywacyjny!');
    } else {
      const { data, error: e } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (e) setError('Nieprawidłowy e-mail lub hasło.');
      else onAuth(data.user);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: C.accent,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 16px',
            }}
          >
            🎾
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 32,
              letterSpacing: 4,
              color: C.text,
            }}
          >
            SQUASH LIGA
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              letterSpacing: 2,
              marginTop: 4,
            }}
          >
            SYSTEM ROZGRYWEK
          </div>
        </div>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              marginBottom: 24,
              background: '#0d0d0d',
              borderRadius: 10,
              padding: 4,
            }}
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError('');
                  setInfo('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: mode === m ? C.accent : 'transparent',
                  color: mode === m ? '#111' : C.muted,
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {m === 'login' ? 'Logowanie' : 'Rejestracja'}
              </button>
            ))}
          </div>
          {mode === 'register' && (
            <Input
              label="Imię i nazwisko"
              value={fullName}
              onChange={(e: any) => setFullName(e.target.value)}
              placeholder="Jan Kowalski"
            />
          )}
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            placeholder="jan@example.com"
          />
          <Input
            label="Hasło"
            type="password"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e: any) => e.key === 'Enter' && handleSubmit()}
          />
          {error && (
            <div
              style={{
                color: C.danger,
                fontSize: 13,
                marginBottom: 12,
                padding: '8px 12px',
                background: '#1a0a0a',
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}
          {info && (
            <div
              style={{
                color: C.success,
                fontSize: 13,
                marginBottom: 12,
                padding: '8px 12px',
                background: '#0a1a0a',
                borderRadius: 8,
              }}
            >
              {info}
            </div>
          )}
          <Btn
            loading={loading}
            onClick={handleSubmit}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {mode === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────
function ProfileModal({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    profile?.avatar_url || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave() {
    if (!fullName.trim()) return setError('Podaj imię i nazwisko.');
    setLoading(true);
    let avatar_url = profile?.avatar_url || null;
    if (avatarFile) {
      const path = `${profile.id}/${Date.now()}.${avatarFile.name
        .split('.')
        .pop()}`;
      const { error: upErr } = await sb.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });
      if (upErr) {
        setError('Błąd uploadu: ' + upErr.message);
        setLoading(false);
        return;
      }
      const { data } = sb.storage.from('avatars').getPublicUrl(path);
      avatar_url = data.publicUrl;
    }
    const { error: e } = await sb
      .from('profiles')
      .update({ full_name: fullName.trim(), avatar_url })
      .eq('id', profile.id);
    if (e) setError('Błąd zapisu profilu.');
    else onSave({ ...profile, full_name: fullName.trim(), avatar_url });
    setLoading(false);
  }

  return (
    <Modal title="Edytuj profil" onClose={onClose}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          {preview ? (
            <img
              src={preview}
              alt=""
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${C.accent}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: '#1a1a1a',
                border: `3px dashed ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              👤
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: C.accent,
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            📷
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <Btn
          variant="dark"
          onClick={() => fileInputRef.current?.click()}
          style={{}}
        >
          📷 Zmień zdjęcie
        </Btn>
      </div>
      <Input
        label="Imię i nazwisko"
        value={fullName}
        onChange={(e: any) => setFullName(e.target.value)}
        error={error}
      />
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 4,
        }}
      >
        <Btn variant="ghost" onClick={onClose} style={{}}>
          Anuluj
        </Btn>
        <Btn loading={loading} onClick={handleSave} style={{}}>
          Zapisz
        </Btn>
      </div>
    </Modal>
  );
}

// ─── SCORE MODAL ──────────────────────────────────────────────────────────────
function ScoreModal({
  match,
  profiles,
  onSave,
  onClose,
}: {
  match: Match;
  profiles: Profile[];
  onSave: (m: Match) => Promise<void>;
  onClose: () => void;
}) {
  const p1 = profiles.find((p) => p.id === match.player1_id);
  const p2 = profiles.find((p) => p.id === match.player2_id);
  const [s1, setS1] = useState<string>(
    match.score1 != null ? String(match.score1) : ''
  );
  const [s2, setS2] = useState<string>(
    match.score2 != null ? String(match.score2) : ''
  );
  const [date, setDate] = useState(match.match_date || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const n1 = parseInt(s1),
      n2 = parseInt(s2);
    if (isNaN(n1) || isNaN(n2) || n1 < 0 || n2 < 0)
      return setError('Podaj poprawne wyniki.');
    if (n1 === n2) return setError('Wyniki nie mogą być remisem!');
    setLoading(true);
    await onSave({
      ...match,
      score1: n1,
      score2: n2,
      played: true,
      match_date: date || null,
    });
    setLoading(false);
  }

  return (
    <Modal title="Wpisz wynik meczu" onClose={onClose}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Avatar profile={p1} size={52} />
          <div style={{ color: C.text, fontSize: 12, marginTop: 6 }}>
            {p1?.full_name}
          </div>
        </div>
        <div style={{ color: '#444', fontSize: 20, fontWeight: 700 }}>VS</div>
        <div style={{ textAlign: 'center' }}>
          <Avatar profile={p2} size={52} />
          <div style={{ color: C.text, fontSize: 12, marginTop: 6 }}>
            {p2?.full_name}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 10,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <input
          type="number"
          min="0"
          value={s1}
          onChange={(e) => setS1(e.target.value)}
          placeholder="0"
          style={{
            background: '#0d0d0d',
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 14,
            color: C.accent,
            fontSize: 32,
            fontWeight: 800,
            textAlign: 'center',
            outline: 'none',
            width: '100%',
          }}
        />
        <span style={{ color: '#444', fontWeight: 700, fontSize: 22 }}>:</span>
        <input
          type="number"
          min="0"
          value={s2}
          onChange={(e) => setS2(e.target.value)}
          placeholder="0"
          style={{
            background: '#0d0d0d',
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 14,
            color: C.accent,
            fontSize: 32,
            fontWeight: 800,
            textAlign: 'center',
            outline: 'none',
            width: '100%',
          }}
        />
      </div>
      <Input
        label="Data meczu"
        type="date"
        value={date}
        onChange={(e: any) => setDate(e.target.value)}
      />
      {error && (
        <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose} style={{}}>
          Anuluj
        </Btn>
        <Btn loading={loading} onClick={handleSave} style={{}}>
          Zapisz wynik
        </Btn>
      </div>
    </Modal>
  );
}

// ─── LEAGUE TABLE ─────────────────────────────────────────────────────────────
function LeagueTable({
  members,
  profiles,
}: {
  members: Member[];
  profiles: Profile[];
}) {
  const sorted = [...members].sort(
    (a, b) => b.points - a.points || b.wins - a.wins
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['#', 'Zawodnik', 'M', 'W', 'P', 'Pkt'].map((c) => (
              <th
                key={c}
                style={{
                  padding: '10px 12px',
                  textAlign: c === 'Zawodnik' ? 'left' : 'center',
                  fontSize: 11,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => {
            const p = profiles.find((x) => x.id === m.player_id);
            return (
              <tr
                key={m.id}
                style={{
                  borderBottom: '1px solid #161616',
                  background: i === 0 ? 'rgba(200,255,0,.035)' : 'transparent',
                }}
              >
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: i < 3 ? C.accent : '#444',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ padding: '12px' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <Avatar profile={p} size={34} />
                    <span
                      style={{ color: C.text, fontWeight: 600, fontSize: 14 }}
                    >
                      {p?.full_name || '?'}
                    </span>
                    {i === 0 && <span>🏆</span>}
                  </div>
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: C.muted,
                    fontSize: 14,
                  }}
                >
                  {m.matches_played}
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: C.success,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {m.wins}
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: C.danger,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {m.losses}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span
                    style={{
                      background: C.accent,
                      color: '#111',
                      borderRadius: 6,
                      padding: '3px 10px',
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {m.points}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  profiles,
  onEnterScore,
  isAdmin,
}: {
  match: Match;
  profiles: Profile[];
  onEnterScore: (m: Match) => void;
  isAdmin: boolean;
}) {
  const p1 = profiles.find((p) => p.id === match.player1_id);
  const p2 = profiles.find((p) => p.id === match.player2_id);
  const winner = match.played ? (match.score1! > match.score2! ? 1 : 2) : null;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '13px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Avatar profile={p1} size={34} />
        <span
          style={{
            color: winner === 1 ? C.accent : C.text,
            fontWeight: winner === 1 ? 700 : 400,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p1?.full_name || '?'}
        </span>
      </div>
      <div style={{ textAlign: 'center', minWidth: 68, flexShrink: 0 }}>
        {match.played ? (
          <div
            style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 22,
              color: C.text,
              letterSpacing: 2,
            }}
          >
            {match.score1}:{match.score2}
          </div>
        ) : (
          <div style={{ color: '#333', fontSize: 13 }}>vs</div>
        )}
        {match.match_date && (
          <div style={{ color: '#444', fontSize: 10, marginTop: 1 }}>
            {match.match_date}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
          justifyContent: 'flex-end',
        }}
      >
        <span
          style={{
            color: winner === 2 ? C.accent : C.text,
            fontWeight: winner === 2 ? 700 : 400,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'right',
          }}
        >
          {p2?.full_name || '?'}
        </span>
        <Avatar profile={p2} size={34} />
      </div>
      {isAdmin && (
        <button
          onClick={() => onEnterScore(match)}
          style={{
            marginLeft: 6,
            background: match.played ? '#1a1a1a' : C.accent,
            color: match.played ? C.muted : '#111',
            border: 'none',
            borderRadius: 8,
            padding: '7px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {match.played ? '✏️' : 'Wynik'}
        </button>
      )}
    </div>
  );
}

// ─── CUP BRACKET ──────────────────────────────────────────────────────────────
function CupBracket({
  cup,
  cupMatches,
  profiles,
  onEnterScore,
  isAdmin,
}: {
  cup: Cup | null;
  cupMatches: CupMatch[];
  profiles: Profile[];
  onEnterScore: (m: CupMatch) => void;
  isAdmin: boolean;
}) {
  const rounds = [...new Set(cupMatches.map((m) => m.round_name))].sort(
    (a, b) => {
      const oa = cupMatches.find((m) => m.round_name === a)?.round_order || 0;
      const ob = cupMatches.find((m) => m.round_name === b)?.round_order || 0;
      return oa - ob;
    }
  ) as string[];

  return (
    <div>
      <h3
        style={{
          color: C.accent,
          fontFamily: "'Bebas Neue',sans-serif",
          fontSize: 22,
          letterSpacing: 2,
          marginBottom: 20,
        }}
      >
        🏅 {cup?.name}
      </h3>
      <div
        style={{
          display: 'flex',
          gap: 24,
          overflowX: 'auto',
          paddingBottom: 12,
        }}
      >
        {rounds.map((round: string) => {
          const rMatches = cupMatches
            .filter((m) => m.round_name === round)
            .sort((a, b) => a.match_order - b.match_order);
          return (
            <div key={round} style={{ minWidth: 230, flex: '0 0 auto' }}>
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                {round}
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {rMatches.map((m) => {
                  const p1 = profiles.find((p) => p.id === m.player1_id);
                  const p2 = profiles.find((p) => p.id === m.player2_id);
                  const winner = m.played
                    ? m.score1! > m.score2!
                      ? 1
                      : 2
                    : null;
                  if (!m.player1_id && !m.player2_id)
                    return (
                      <div
                        key={m.id}
                        style={{
                          background: '#0a0a0a',
                          border: `1px dashed ${C.border}`,
                          borderRadius: 12,
                          padding: 14,
                          textAlign: 'center',
                          color: '#2a2a2a',
                          fontSize: 12,
                        }}
                      >
                        Oczekiwanie na awans
                      </div>
                    );
                  return (
                    <div
                      key={m.id}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}
                    >
                      {[
                        { p: p1, score: m.score1, w: winner === 1 },
                        { p: p2, score: m.score2, w: winner === 2 },
                      ].map((row, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 12px',
                            borderBottom:
                              idx === 0 ? '1px solid #161616' : 'none',
                            background: row.w
                              ? 'rgba(200,255,0,.06)'
                              : 'transparent',
                          }}
                        >
                          {row.p ? (
                            <Avatar profile={row.p} size={26} />
                          ) : (
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: '#1a1a1a',
                              }}
                            />
                          )}
                          <span
                            style={{
                              color: row.w ? C.accent : '#aaa',
                              fontSize: 13,
                              flex: 1,
                              fontWeight: row.w ? 700 : 400,
                            }}
                          >
                            {row.p?.full_name || 'TBD'}
                          </span>
                          <span
                            style={{
                              color: C.text,
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {row.score ?? '-'}
                          </span>
                        </div>
                      ))}
                      {isAdmin && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderTop: '1px solid #161616',
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            onClick={() => onEnterScore(m)}
                            style={{
                              background: m.played ? '#1a1a1a' : C.accent,
                              color: m.played ? C.muted : '#111',
                              border: 'none',
                              borderRadius: 6,
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {m.played ? '✏️' : 'Wynik'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('liga');
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cup, setCup] = useState<Cup | null>(null);
  const [cupMatches, setCupMatches] = useState<CupMatch[]>([]);

  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [newLeagueModal, setNewLeagueModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [newCupModal, setNewCupModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const isAdmin = !!(league && myProfile && league.created_by === myProfile.id);

  function showToast(msg: string, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data }: { data: any }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e: any, s: any) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else {
        setMyProfile(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    const { data } = await sb
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    setMyProfile(data);
    setLoading(false);
    if (data) loadLeague();
  }

  async function loadLeague() {
    const { data: leagues } = await sb
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (leagues?.length) {
      setLeague(leagues[0]);
      await loadAll(leagues[0].id);
    }
  }

  async function loadAll(leagueId: number) {
    const [{ data: mem }, { data: mat }, { data: cups }] = await Promise.all([
      sb.from('league_members').select('*').eq('league_id', leagueId),
      sb
        .from('matches')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at'),
      sb
        .from('cups')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    setMembers((mem as Member[]) || []);
    setMatches((mat as Match[]) || []);
    if (cups?.length) {
      setCup(cups[0]);
      const { data: cm } = await sb
        .from('cup_matches')
        .select('*')
        .eq('cup_id', cups[0].id)
        .order('round_order')
        .order('match_order');
      setCupMatches((cm as CupMatch[]) || []);
    }
    const ids = [...new Set(((mem as Member[]) || []).map((m) => m.player_id))];
    if (ids.length) {
      const { data: profs } = await sb
        .from('profiles')
        .select('*')
        .in('id', ids);
      setProfiles((profs as Profile[]) || []);
    }
  }

  // ── NEW LEAGUE ──────────────────────────────────────────────────────────────
  function NewLeagueModal() {
    const [name, setName] = useState('');
    const [season, setSeason] = useState('');
    const [saving, setSaving] = useState(false);

    async function create() {
      if (!name.trim() || !myProfile) return;
      setSaving(true);
      const { data, error } = await sb
        .from('leagues')
        .insert({
          name: name.trim(),
          season: season.trim() || null,
          created_by: myProfile.id,
        })
        .select()
        .single();
      if (!error && data) {
        setLeague(data as League);
        setMembers([]);
        setMatches([]);
        setCup(null);
        setCupMatches([]);
        await sb
          .from('league_members')
          .insert({ league_id: data.id, player_id: myProfile.id });
        setMembers([
          {
            id: 0,
            league_id: data.id,
            player_id: myProfile.id,
            wins: 0,
            losses: 0,
            points: 0,
            matches_played: 0,
          },
        ]);
        setProfiles([myProfile]);
        showToast('Liga utworzona!');
        setNewLeagueModal(false);
      }
      setSaving(false);
    }

    return (
      <Modal title="Nowa liga" onClose={() => setNewLeagueModal(false)}>
        <Input
          label="Nazwa ligi"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="np. Liga Wiosenna 2025"
        />
        <Input
          label="Sezon (opcjonalnie)"
          value={season}
          onChange={(e: any) => setSeason(e.target.value)}
          placeholder="np. 2025"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn
            variant="ghost"
            onClick={() => setNewLeagueModal(false)}
            style={{}}
          >
            Anuluj
          </Btn>
          <Btn loading={saving} onClick={create} style={{}}>
            Utwórz
          </Btn>
        </div>
      </Modal>
    );
  }

  // ── ADD MEMBER ──────────────────────────────────────────────────────────────
  function AddMemberModal() {
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    async function add() {
      setErr('');
      if (!search.trim() || !league) return;
      setSaving(true);
      const { data: users } = await sb.from('profiles').select('*');
      const found = (users as Profile[])?.find((u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase())
      );
      if (!found) {
        setErr('Nie znaleziono. Upewnij się że użytkownik się zarejestrował.');
        setSaving(false);
        return;
      }
      if (members.find((m) => m.player_id === found.id)) {
        setErr('Ten zawodnik już jest w lidze.');
        setSaving(false);
        return;
      }
      const { error } = await sb
        .from('league_members')
        .insert({ league_id: league.id, player_id: found.id });
      if (!error) {
        setMembers((prev) => [
          ...prev,
          {
            id: Date.now(),
            league_id: league.id,
            player_id: found.id,
            wins: 0,
            losses: 0,
            points: 0,
            matches_played: 0,
          },
        ]);
        if (!profiles.find((p) => p.id === found.id))
          setProfiles((prev) => [...prev, found]);
        showToast(`${found.full_name} dodany!`);
        setAddMemberModal(false);
      } else setErr('Błąd dodawania.');
      setSaving(false);
    }

    return (
      <Modal title="Dodaj zawodnika" onClose={() => setAddMemberModal(false)}>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          Wpisz imię i nazwisko (musi mieć konto w systemie).
        </div>
        <Input
          label="Imię i nazwisko"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder="np. Jan Kowalski"
          error={err}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn
            variant="ghost"
            onClick={() => setAddMemberModal(false)}
            style={{}}
          >
            Anuluj
          </Btn>
          <Btn loading={saving} onClick={add} style={{}}>
            Dodaj
          </Btn>
        </div>
      </Modal>
    );
  }

  // ── GENERATE MATCHES ────────────────────────────────────────────────────────
  async function generateMatches() {
    if (!isAdmin || !league) return;
    if (members.length < 2)
      return showToast('Potrzeba co najmniej 2 zawodników!', 'error');
    if (!confirm('Wygenerować nowy harmonogram?')) return;
    await sb
      .from('matches')
      .delete()
      .eq('league_id', league.id)
      .eq('played', false);
    const newMatches = [];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        newMatches.push({
          league_id: league.id,
          player1_id: members[i].player_id,
          player2_id: members[j].player_id,
          played: false,
        });
      }
    }
    const { data } = await sb.from('matches').insert(newMatches).select();
    setMatches((prev) => [
      ...prev.filter((m) => m.played),
      ...((data as Match[]) || []),
    ]);
    showToast('Harmonogram wygenerowany!');
  }

  // ── SAVE SCORE ──────────────────────────────────────────────────────────────
  async function handleSaveScore(updated: Match) {
    const table = updated.cup_id ? 'cup_matches' : 'matches';
    const { error } = await sb
      .from(table)
      .update({
        score1: updated.score1,
        score2: updated.score2,
        played: true,
        match_date: updated.match_date,
      })
      .eq('id', updated.id);
    if (error) {
      showToast('Błąd zapisu!', 'error');
      return;
    }

    if (updated.cup_id) {
      const updatedCM = cupMatches.map((m) =>
        m.id === updated.id
          ? {
              ...m,
              score1: updated.score1,
              score2: updated.score2,
              played: true,
            }
          : m
      );
      setCupMatches(updatedCM);
      await advanceCupWinners(updatedCM);
    } else {
      const updatedMatches = matches.map((m) =>
        m.id === updated.id ? { ...m, ...updated } : m
      );
      setMatches(updatedMatches);
      await recalcAndSaveStats(updatedMatches);
    }
    setScoreModal(null);
    showToast('Wynik zapisany!');
  }

  async function recalcAndSaveStats(allMatches: Match[]) {
    const stats: Record<
      string,
      { wins: number; losses: number; points: number; matches_played: number }
    > = {};
    members.forEach((m) => {
      stats[m.player_id] = { wins: 0, losses: 0, points: 0, matches_played: 0 };
    });
    allMatches
      .filter((m) => m.played)
      .forEach((m) => {
        if (!stats[m.player1_id] || !stats[m.player2_id]) return;
        stats[m.player1_id].matches_played++;
        stats[m.player2_id].matches_played++;
        if (m.score1! > m.score2!) {
          const { winnerPts, loserPts } = calcPoints(m.score1!, m.score2!);
          stats[m.player1_id].wins++;
          stats[m.player1_id].points += winnerPts;
          stats[m.player2_id].losses++;
          stats[m.player2_id].points += loserPts;
        } else {
          const { winnerPts, loserPts } = calcPoints(m.score2!, m.score1!);
          stats[m.player2_id].wins++;
          stats[m.player2_id].points += winnerPts;
          stats[m.player1_id].losses++;
          stats[m.player1_id].points += loserPts;
        }
      });
    const updates = members.map((m) =>
      sb.from('league_members').update(stats[m.player_id]).eq('id', m.id)
    );
    await Promise.all(updates);
    setMembers(members.map((m) => ({ ...m, ...stats[m.player_id] })));
  }

  async function advanceCupWinners(cm: CupMatch[]) {
    const rounds = [...new Set(cm.map((m) => m.round_name))].sort((a, b) => {
      return (
        (cm.find((m) => m.round_name === a)?.round_order || 0) -
        (cm.find((m) => m.round_name === b)?.round_order || 0)
      );
    }) as string[];
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const currentRound = cm
        .filter((m) => m.round_name === rounds[ri])
        .sort((a, b) => a.match_order - b.match_order);
      const nextRound = cm
        .filter((m) => m.round_name === rounds[ri + 1])
        .sort((a, b) => a.match_order - b.match_order);
      currentRound.forEach((m, idx) => {
        if (!m.played) return;
        const winnerId = m.score1! > m.score2! ? m.player1_id : m.player2_id;
        const nextMatchIdx = Math.floor(idx / 2);
        const field = idx % 2 === 0 ? 'player1_id' : 'player2_id';
        if (nextRound[nextMatchIdx]) {
          sb.from('cup_matches')
            .update({ [field]: winnerId })
            .eq('id', nextRound[nextMatchIdx].id);
        }
      });
    }
    if (cup) {
      const { data } = await sb
        .from('cup_matches')
        .select('*')
        .eq('cup_id', cup.id)
        .order('round_order')
        .order('match_order');
      setCupMatches((data as CupMatch[]) || []);
    }
  }

  // ── NEW CUP ─────────────────────────────────────────────────────────────────
  function NewCupModal() {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    async function create() {
      if (!name.trim() || !league || !myProfile) return;
      setSaving(true);
      const { data: newCup } = await sb
        .from('cups')
        .insert({
          name: name.trim(),
          league_id: league.id,
          created_by: myProfile.id,
        })
        .select()
        .single();
      if (!newCup) {
        setSaving(false);
        return;
      }
      const shuffled = [...members].sort(() => Math.random() - 0.5);
      const sfMatches = [];
      for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
        sfMatches.push({
          cup_id: newCup.id,
          round_name: 'Półfinał',
          round_order: 1,
          match_order: i + 1,
          player1_id: shuffled[i * 2]?.player_id || null,
          player2_id: shuffled[i * 2 + 1]?.player_id || null,
          played: false,
        });
      }
      const finalMatch = {
        cup_id: newCup.id,
        round_name: 'Finał',
        round_order: 2,
        match_order: 1,
        player1_id: null,
        player2_id: null,
        played: false,
      };
      const { data: cm } = await sb
        .from('cup_matches')
        .insert([...sfMatches, finalMatch])
        .select();
      setCup(newCup as Cup);
      setCupMatches((cm as CupMatch[]) || []);
      showToast('Puchar utworzony!');
      setNewCupModal(false);
      setSaving(false);
    }

    return (
      <Modal title="Nowy puchar" onClose={() => setNewCupModal(false)}>
        <Input
          label="Nazwa pucharu"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="np. Puchar Wiosny 2025"
        />
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          Zawodnicy: {members.length} • Format: losowy półfinał → finał
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setNewCupModal(false)} style={{}}>
            Anuluj
          </Btn>
          <Btn loading={saving} onClick={create} style={{}}>
            Utwórz
          </Btn>
        </div>
      </Modal>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <style>{css}</style>
        <Spinner size={40} />
      </div>
    );

  if (!session) return <AuthPage onAuth={(u: any) => loadProfile(u.id)} />;

  const TABS = [
    { id: 'liga', label: '🏆 Liga' },
    { id: 'mecze', label: '⚡ Mecze' },
    { id: 'puchar', label: '🥇 Puchar' },
    { id: 'zawodnicy', label: '👤 Zawodnicy' },
  ];

  const upcomingMatches = matches.filter((m) => !m.played);
  const playedMatches = matches.filter((m) => m.played);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{css}</style>

      {/* Header */}
      <div
        style={{
          background: '#0a0a0a',
          borderBottom: `1px solid ${C.border}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: C.accent,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🎾
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue',sans-serif",
                fontSize: 20,
                letterSpacing: 3,
                lineHeight: 1,
              }}
            >
              SQUASH LIGA
            </div>
            {league && (
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>
                {league.name}
                {league.season ? ` · ${league.season}` : ''}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setProfileModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Avatar profile={myProfile} size={34} />
          </button>
          <Btn
            variant="dark"
            style={{ padding: '7px 12px', fontSize: 12 }}
            onClick={() => sb.auth.signOut()}
          >
            Wyloguj
          </Btn>
        </div>
      </div>

      {/* No league */}
      {!league && (
        <div
          style={{
            maxWidth: 500,
            margin: '60px auto',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏟️</div>
          <div
            style={{
              color: C.text,
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Brak aktywnej ligi
          </div>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
            Utwórz nową ligę, aby zacząć!
          </div>
          <Btn onClick={() => setNewLeagueModal(true)} style={{}}>
            + Utwórz ligę
          </Btn>
        </div>
      )}

      {league && (
        <>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${C.border}`,
              overflowX: 'auto',
              background: '#0a0a0a',
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '13px 18px',
                  background: 'none',
                  border: 'none',
                  color: tab === t.id ? C.accent : C.muted,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  borderBottom: `2px solid ${
                    tab === t.id ? C.accent : 'transparent'
                  }`,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            style={{ maxWidth: 820, margin: '0 auto', padding: '22px 14px' }}
          >
            {/* LIGA */}
            {tab === 'liga' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 18,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Bebas Neue',sans-serif",
                      fontSize: 22,
                      letterSpacing: 2,
                    }}
                  >
                    Tabela ligowa
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isAdmin && (
                      <Btn variant="dark" onClick={generateMatches} style={{}}>
                        🔄 Generuj mecze
                      </Btn>
                    )}
                    {isAdmin && (
                      <Btn
                        variant="dark"
                        onClick={() => setAddMemberModal(true)}
                        style={{}}
                      >
                        + Zawodnik
                      </Btn>
                    )}
                  </div>
                </div>
                {members.length === 0 ? (
                  <div
                    style={{ color: C.muted, textAlign: 'center', padding: 40 }}
                  >
                    Brak zawodników.
                  </div>
                ) : (
                  <LeagueTable members={members} profiles={profiles} />
                )}
              </div>
            )}

            {/* MECZE */}
            {tab === 'mecze' && (
              <div>
                {upcomingMatches.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 10,
                      }}
                    >
                      Zaplanowane ({upcomingMatches.length})
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 7,
                      }}
                    >
                      {upcomingMatches.map((m) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          profiles={profiles}
                          onEnterScore={setScoreModal}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {playedMatches.length > 0 && (
                  <div>
                    <div
                      style={{
                        color: C.muted,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 10,
                      }}
                    >
                      Rozegrane ({playedMatches.length})
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 7,
                      }}
                    >
                      {[...playedMatches].reverse().map((m) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          profiles={profiles}
                          onEnterScore={setScoreModal}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {matches.length === 0 && (
                  <div
                    style={{ color: C.muted, textAlign: 'center', padding: 40 }}
                  >
                    Brak meczów.
                  </div>
                )}
              </div>
            )}

            {/* PUCHAR */}
            {tab === 'puchar' && (
              <div>
                {!cup ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
                    <div style={{ color: C.muted, marginBottom: 20 }}>
                      Brak aktywnego pucharu.
                    </div>
                    {isAdmin && (
                      <Btn onClick={() => setNewCupModal(true)} style={{}}>
                        + Utwórz puchar
                      </Btn>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 18,
                      }}
                    >
                      {isAdmin && (
                        <Btn
                          variant="dark"
                          onClick={() => setNewCupModal(true)}
                          style={{}}
                        >
                          + Nowy puchar
                        </Btn>
                      )}
                    </div>
                    <CupBracket
                      cup={cup}
                      cupMatches={cupMatches}
                      profiles={profiles}
                      onEnterScore={(m: CupMatch) =>
                        setScoreModal({
                          ...m,
                          league_id: league.id,
                          player1_id: m.player1_id!,
                          player2_id: m.player2_id!,
                          cup_id: cup.id,
                          match_date: null,
                        } as unknown as Match)
                      }
                      isAdmin={isAdmin}
                    />
                  </>
                )}
              </div>
            )}

            {/* ZAWODNICY */}
            {tab === 'zawodnicy' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 18,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Bebas Neue',sans-serif",
                      fontSize: 22,
                      letterSpacing: 2,
                    }}
                  >
                    Zawodnicy
                  </h2>
                  {isAdmin && (
                    <Btn onClick={() => setAddMemberModal(true)} style={{}}>
                      + Dodaj zawodnika
                    </Btn>
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                    gap: 12,
                  }}
                >
                  {members.map((mem) => {
                    const p = profiles.find((x) => x.id === mem.player_id);
                    return (
                      <div
                        key={mem.id}
                        style={{
                          background: C.card,
                          border: `1px solid ${C.border}`,
                          borderRadius: 14,
                          padding: 18,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Avatar profile={p} size={60} />
                        <div
                          style={{
                            color: C.text,
                            fontWeight: 700,
                            fontSize: 14,
                            textAlign: 'center',
                          }}
                        >
                          {p?.full_name || '?'}
                        </div>
                        {p?.id === myProfile?.id && (
                          <span
                            style={{
                              fontSize: 10,
                              background: 'rgba(200,255,0,.15)',
                              color: C.accent,
                              borderRadius: 20,
                              padding: '2px 8px',
                            }}
                          >
                            Ty
                          </span>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            gap: 14,
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                color: C.success,
                                fontWeight: 800,
                                fontSize: 16,
                              }}
                            >
                              {mem.wins}
                            </div>
                            <div style={{ color: '#444' }}>W</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                color: C.danger,
                                fontWeight: 800,
                                fontSize: 16,
                              }}
                            >
                              {mem.losses}
                            </div>
                            <div style={{ color: '#444' }}>P</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                color: C.accent,
                                fontWeight: 800,
                                fontSize: 16,
                              }}
                            >
                              {mem.points}
                            </div>
                            <div style={{ color: '#444' }}>Pkt</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {scoreModal && (
        <ScoreModal
          match={scoreModal}
          profiles={profiles}
          onSave={handleSaveScore}
          onClose={() => setScoreModal(null)}
        />
      )}
      {profileModal && myProfile && (
        <ProfileModal
          profile={myProfile}
          onSave={(p: Profile) => {
            setMyProfile(p);
            setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            setProfileModal(false);
            showToast('Profil zaktualizowany!');
          }}
          onClose={() => setProfileModal(false)}
        />
      )}
      {newLeagueModal && <NewLeagueModal />}
      {addMemberModal && <AddMemberModal />}
      {newCupModal && <NewCupModal />}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
