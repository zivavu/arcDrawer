import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
} from 'react';
import './App.css';

import { Painter, type StrokeSettings } from './gl/painter';

type UiControls = {
	blur: number;
	saturation: number;
	hueOffset: number;
	strokesNumber: number;
	lineWidth: number;
	lineDecay: number;
	offsetWeight: number;
	previousOffsetMultiplier: number;
	color: string;
	hueRandomize: number;
	blurJitter: number;
};

type BrushPreset = {
	id: string;
	name: string;
	ui: UiControls;
};

const defaults: UiControls = {
	blur: 6,
	saturation: 1,
	hueOffset: 0,
	strokesNumber: 10,
	lineWidth: 8,
	lineDecay: 0.5,
	offsetWeight: 50,
	previousOffsetMultiplier: 0.8,
	color: '#d7e7ff',
	hueRandomize: 40,
	blurJitter: 0.2,
};

function hexToRgba(hex: string): [number, number, number, number] {
	const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
	const r = parseInt(m[1], 16) / 255;
	const g = parseInt(m[2], 16) / 255;
	const b = parseInt(m[3], 16) / 255;
	return [r, g, b, 1];
}

function App() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const painterRef = useRef<Painter | null>(null);
	const [ui, setUi] = useState<UiControls>(() => {
		try {
			const saved = localStorage.getItem('arcdrawer:lastUi');
			if (saved) return JSON.parse(saved) as UiControls;
		} catch {
			void 0;
		}
		return defaults;
	});
	const [presets, setPresets] = useState<BrushPreset[]>(() => {
		try {
			const raw = localStorage.getItem('arcdrawer:presets');
			if (!raw) return [];
			const parsed = JSON.parse(raw) as BrushPreset[];
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			void 0;
			return [];
		}
	});
	const [presetName, setPresetName] = useState('My Brush');
	const [mouseHolding, setMouseHolding] = useState(false);
	const lastPosRef = useRef<{ x: number; y: number } | null>(null);
	const uiRef = useRef<UiControls>(ui);

	// keep latest UI values for the render loop without re-creating the effect
	useEffect(() => {
		uiRef.current = ui;
	}, [ui]);

	// persist current UI
	useEffect(() => {
		try {
			localStorage.setItem('arcdrawer:lastUi', JSON.stringify(ui));
		} catch {
			void 0;
		}
	}, [ui]);

	// persist presets
	useEffect(() => {
		try {
			localStorage.setItem('arcdrawer:presets', JSON.stringify(presets));
		} catch {
			void 0;
		}
	}, [presets]);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
		if (!gl) return;
		const resize = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const w = Math.floor(canvas.clientWidth * dpr);
			const h = Math.floor(canvas.clientHeight * dpr);
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				painterRef.current?.resize(w, h);
			}
		};
		painterRef.current = new Painter(gl, canvas.width || 1, canvas.height || 1);
		const ro = new ResizeObserver(resize);
		ro.observe(canvas);
		resize();
		const loop = () => {
			const u = uiRef.current;
			// Per-line blur is handled in the brush shader; disable global blur here
			painterRef.current?.present(0.0, u.saturation, u.hueOffset);
			requestAnimationFrame(loop);
		};
		loop();
		return () => ro.disconnect();
	}, []);

	const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = e.target as HTMLCanvasElement;
		const rect = canvas.getBoundingClientRect();
		const scale = canvas.width / rect.width;
		const x = (e.clientX - rect.left) * scale;
		const y = (e.clientY - rect.top) * scale;
		if (mouseHolding) {
			const last = lastPosRef.current || { x, y };
			// scale-dependent stroke parameters (DPR aware)
			const settings: StrokeSettings = {
				strokesNumber: ui.strokesNumber,
				baseLineWidth: ui.lineWidth * scale,
				lineDecay: ui.lineDecay,
				offsetWeight: ui.offsetWeight * scale,
				previousOffsetMultiplier: ui.previousOffsetMultiplier,
				color: hexToRgba(ui.color),
				hueRandomize: ui.hueRandomize,
				blurSigmaPx: ui.blur * scale,
				blurJitter: ui.blurJitter,
			};
			painterRef.current?.paintStroke(last.x, last.y, settings);
			lastPosRef.current = { x, y };
		}
	};
	const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = e.target as HTMLCanvasElement;
		canvas.setPointerCapture(e.pointerId);
		setMouseHolding(true);
		painterRef.current?.captureRestorePoint(12);
		const rect = canvas.getBoundingClientRect();
		const scale = canvas.width / rect.width;
		lastPosRef.current = {
			x: (e.clientX - rect.left) * scale,
			y: (e.clientY - rect.top) * scale,
		};
	};
	const onPointerUp = () => {
		setMouseHolding(false);
		lastPosRef.current = null;
	};

	const change =
		<K extends keyof UiControls>(k: K) =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const val = (
				e.target.type === 'color' ? e.target.value : Number(e.target.value)
			) as UiControls[K];
			setUi((prev) => ({ ...prev, [k]: val }));
		};

	// presets API
	const savePreset = () => {
		const id = `${Date.now().toString(36)}_${Math.random()
			.toString(36)
			.slice(2, 7)}`;
		const name = presetName.trim() || 'Brush';
		setPresets((prev) => [{ id, name, ui }, ...prev].slice(0, 50));
	};
	const applyPreset = (id: string) => {
		const p = presets.find((p) => p.id === id);
		if (p) setUi(p.ui);
	};
	const deletePreset = (id: string) => {
		setPresets((prev) => prev.filter((p) => p.id !== id));
	};

	const undo = useCallback(() => painterRef.current?.undo(), []);
	const clear = () => painterRef.current?.clear();
	const redo = useCallback(() => painterRef.current?.redo(), []);
	const saveImage = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const a = document.createElement('a');
		a.href = canvas.toDataURL('image/png');
		a.download = `arcdrawer_${Date.now()}.png`;
		a.click();
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				// Ctrl for Windows/Linux, Meta (Cmd) for Mac
				if (e.key === 'z') {
					e.preventDefault();
					undo();
				} else if (e.key === 'y') {
					e.preventDefault();
					redo();
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [undo, redo]);

	return (
		<div className="app-root">
			<canvas
				ref={canvasRef}
				className="webgl-canvas"
				onPointerMove={onPointerMove}
				onPointerDown={onPointerDown}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			/>

			<div className="controls">
				<label>Line Blur σ</label>
				<input
					type="range"
					min={1}
					max={10}
					step={0.1}
					value={ui.blur}
					onChange={change('blur')}
				/>

				<label>Saturation</label>
				<input
					type="range"
					min={0}
					max={2}
					step={0.01}
					value={ui.saturation}
					onChange={change('saturation')}
				/>

				<label>Hue Offset</label>
				<input
					type="range"
					min={-180}
					max={180}
					step={1}
					value={ui.hueOffset}
					onChange={change('hueOffset')}
				/>

				<label>Segments</label>
				<input
					type="range"
					min={2}
					max={20}
					step={1}
					value={ui.strokesNumber}
					onChange={change('strokesNumber')}
				/>

				<label>Line Width</label>
				<input
					type="range"
					min={1}
					max={15}
					step={0.5}
					value={ui.lineWidth}
					onChange={change('lineWidth')}
				/>

				<label>Line Decay</label>
				<input
					type="range"
					min={0.1}
					max={2}
					step={0.01}
					value={ui.lineDecay}
					onChange={change('lineDecay')}
				/>

				<label>Offset Weight</label>
				<input
					type="range"
					min={0}
					max={120}
					step={1}
					value={ui.offsetWeight}
					onChange={change('offsetWeight')}
				/>

				<label>Momentum</label>
				<input
					type="range"
					min={0}
					max={1.2}
					step={0.01}
					value={ui.previousOffsetMultiplier}
					onChange={change('previousOffsetMultiplier')}
				/>

				<label>Color</label>
				<input type="color" value={ui.color} onChange={change('color')} />

				<label>Hue Rand</label>
				<input
					type="range"
					min={0}
					max={180}
					step={1}
					value={ui.hueRandomize}
					onChange={change('hueRandomize')}
				/>

				<label>Blur Jitter</label>
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={ui.blurJitter}
					onChange={change('blurJitter')}
				/>
			</div>

			<div className="toolbar">
				<button onClick={undo}>Undo</button>
				<button onClick={clear}>Clear</button>
				<button onClick={saveImage}>Save PNG</button>
			</div>

			<div className="presets panel">
				<div className="presets-header">Brushes</div>
				<div className="presets-row">
					<input
						className="preset-name"
						value={presetName}
						onChange={(e) => setPresetName(e.target.value)}
						placeholder="Preset name"
					/>
					<button className="preset-save" onClick={savePreset}>
						Save
					</button>
				</div>
				<div className="presets-list">
					{presets.length === 0 && (
						<div className="presets-empty">No presets yet</div>
					)}
					{presets.map((p) => (
						<div key={p.id} className="preset-item">
							<button
								className="apply"
								title={p.name}
								onClick={() => applyPreset(p.id)}>
								{p.name}
							</button>
							<button
								className="delete"
								aria-label="Delete"
								title="Delete"
								onClick={() => deletePreset(p.id)}>
								×
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default App;
