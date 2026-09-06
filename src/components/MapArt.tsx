// Lightweight, offline vector scenery. Stage selects only the artwork;
// unlocks, region names and guardians remain owned by the game catalog.
const PALETTES = [
	["#ccece2", "#8bd4ac", "#4c997f"],
	["#f9e8bf", "#ebc883", "#bb8e5f"],
	["#dceecb", "#a5d47f", "#629b68"],
	["#faeabb", "#e7c46c", "#bd944d"],
	["#565080", "#aaa0d8", "#706699"],
	["#efe0f0", "#b9b0e4", "#8b80b1"],
	["#dcd7f2", "#b5a0dc", "#846baf"],
] as const

function Tree({
	x,
	y,
	color = "#589b7c",
}: {
	x: number
	y: number
	color?: string
}) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<path d="M0 0v26" stroke="#7c7157" strokeWidth="5" />
			<path d="M-16 12 0-23 16 12Z" fill={color} />
			<path d="M0-23 16 12H0Z" fill="#355d65" opacity=".15" />
		</g>
	)
}

function Clover({ x, y }: { x: number; y: number }) {
	return (
		<g transform={`translate(${x} ${y})`} fill="#4b9868">
			<path d="M0 0q7 14 0 25" fill="none" stroke="#477e52" strokeWidth="4" />
			<circle cx="-7" cy="-7" r="9" />
			<circle cx="7" cy="-7" r="9" />
			<circle cx="-7" cy="7" r="9" />
			<circle cx="7" cy="7" r="9" />
			<circle r="4" fill="#c7df8d" />
		</g>
	)
}

export function MapIslandArt({ stage }: { stage: number }) {
	const [sky, grass, rock] = PALETTES[stage] ?? PALETTES[0]
	return (
		<svg viewBox="0 0 360 150" className="map-island-art" aria-hidden="true">
			<path d="M0 0h360v150H0Z" fill={sky} />
			{stage !== 4 && (
				<g fill="#fff" opacity=".5">
					<path d="M20 35q0-11 12-10 7-20 23-5 14-2 16 15Z" />
					<path d="M269 25q4-12 14-8 8-16 20-4 16 0 16 12Z" />
				</g>
			)}
			<ellipse cx="180" cy="132" rx="128" ry="10" fill={rock} opacity=".16" />
			<path
				d="M38 98q15 29 57 34l32 8 31-6 28 12 32-14 35 4 42-19 27-19Z"
				fill={rock}
			/>
			<path
				d="m95 109 16 22 16 9 12-30m65 0 14 22 35 4-9-26"
				fill="#fff"
				opacity=".13"
			/>
			<ellipse cx="180" cy="98" rx="142" ry="28" fill={grass} />
			<path
				d="M43 105q136 43 274 0"
				fill="none"
				stroke={rock}
				strokeWidth="3"
				opacity=".5"
			/>
			{stage === 0 && (
				<>
					<Tree x={72} y={69} />
					<Tree x={278} y={61} color="#7cb387" />
					<path
						d="M128 63h59v39h-59Z"
						fill="#fff0d2"
						stroke="#b08d6e"
						strokeWidth="2"
					/>
					<path
						d="m119 65 38-34 41 34Z"
						fill="#df987a"
						stroke="#b77363"
						strokeWidth="2"
					/>
					<path d="m157 31 41 34h-41Z" fill="#c77b69" />
					<path d="M153 102V84q8-11 15 0v18" fill="#826c90" />
					<rect x="135" y="73" width="10" height="12" rx="2" fill="#8dc7cb" />
					<path
						d="M161 104q-24 7-16 18"
						fill="none"
						stroke="#f4dfad"
						strokeWidth="8"
					/>
					<g fill="#fff0bd">
						<circle cx="83" cy="99" r="3" />
						<circle cx="93" cy="106" r="3" />
						<circle cx="281" cy="99" r="3" />
					</g>
				</>
			)}
			{stage === 1 && (
				<>
					<circle cx="262" cy="32" r="17" fill="#fff5d8" />
					<path
						d="m98 102 60-77 57 77Z"
						fill="#f4d294"
						stroke="#c89d62"
						strokeWidth="2"
					/>
					<path d="m158 25 57 77h-45Z" fill="#cca365" />
					<path d="M143 102V86l9-9 9 9v16" fill="#997954" />
					<path
						d="M76 98V65m0 19q-15 0-15-14m15 8q12 0 12-19"
						stroke="#719874"
						strokeWidth="9"
						fill="none"
					/>
					<path d="m252 99 17-22 17 22" fill="#d5ad71" />
				</>
			)}
			{stage === 2 && (
				<>
					<Clover x={145} y={63} />
					<Clover x={94} y={81} />
					<Clover x={279} y={74} />
					<path d="M176 91q-24-25-32 0Z" fill="#e99bb1" />
					<path d="M161 91v15" stroke="#f9efcd" strokeWidth="7" />
					<g fill="#fff3d1">
						<circle cx="71" cy="103" r="4" />
						<circle cx="187" cy="112" r="3" />
						<circle cx="284" cy="105" r="4" />
					</g>
				</>
			)}
			{stage === 3 && (
				<>
					{[
						[133, 53],
						[163, 71],
						[133, 89],
						[103, 71],
					].map(([x, y]) => (
						<g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
							<path
								d="m0-20 17 10v20L0 20l-17-10v-20Z"
								fill="#efb74c"
								stroke="#bf873b"
								strokeWidth="3"
							/>
							<path d="m0-11 9 5v12L0 12l-9-6V-6Z" fill="#ffe5a0" />
						</g>
					))}
					<Tree x={282} y={73} color="#b2ad60" />
					<g transform="translate(214 37)">
						<ellipse cx="-4" cy="-7" rx="5" ry="8" fill="#fff9e7" />
						<ellipse cx="5" cy="-7" rx="5" ry="8" fill="#fff9e7" />
						<ellipse rx="12" ry="7" fill="#e5ae40" />
						<path d="M-3-6v12m7-12v12" stroke="#886341" strokeWidth="3" />
					</g>
				</>
			)}
			{stage === 4 && (
				<>
					<path
						d="M95 24a18 18 0 1 0 23 22A22 22 0 0 1 95 24Z"
						fill="#fff0ba"
					/>
					{(
						[
							[143, 24],
							[181, 17],
							[222, 30],
							[267, 24],
							[305, 49],
							[53, 53],
							[131, 57],
							[203, 57],
							[284, 67],
						] as const
					).map(([x, y]) => (
						<path
							key={`${x}-${y}`}
							d={`m${x} ${y - 5} 2 4 4 1-4 2-2 4-1-4-4-2 4-1Z`}
							fill="#fff0ba"
						/>
					))}
					<path d="M142 96V70h-8l17-15 17 15h-8v26" fill="#e2d8ee" />
					<path d="M143 73h16v12h-16Z" fill="#fff0ba" />
					<path
						d="M77 105q94-25 181 0"
						fill="none"
						stroke="#d9c4ef"
						strokeWidth="5"
					/>
				</>
			)}
			{stage === 5 && (
				<>
					{[
						"#d7899f",
						"#e9ad85",
						"#edcd83",
						"#9fc39a",
						"#80b9c3",
						"#999aca",
						"#b397cc",
					].map((color, i) => (
						<path
							key={color}
							d={`M${84 + i * 5} 95a${72 - i * 5} ${66 - i * 5} 0 0 1 ${144 - i * 10} 0`}
							stroke={color}
							strokeWidth="5.5"
							fill="none"
						/>
					))}
					<path
						d="M65 98q-3-14 11-15 8-17 21-3 15-3 16 18Zm133 0q-3-14 11-15 8-17 21-3 15-3 16 18Z"
						fill="#fff8ff"
					/>
				</>
			)}
			{stage === 6 && (
				<>
					<path
						d="M170 63c-67-68-92 68-24 22l24-22c67-68 92 68 24 22Z"
						fill="none"
						stroke="#8161b1"
						strokeWidth="16"
					/>
					<path
						d="M170 60c-67-68-92 68-24 22l24-22c67-68 92 68 24 22Z"
						fill="none"
						stroke="#f1d9fb"
						strokeWidth="8"
					/>
					<path
						d="m69 90 9-25 10 25-10 11Zm213-39 8-21 9 21-9 11Z"
						fill="#a58acc"
						stroke="#f1d9fb"
						strokeWidth="2"
					/>
					<g fill="#fff5d8">
						<circle cx="115" cy="28" r="3" />
						<circle cx="261" cy="79" r="3" />
						<circle cx="195" cy="26" r="3" />
					</g>
				</>
			)}
		</svg>
	)
}

export function MapPortalArt() {
	return (
		<svg
			className="map-portal-art"
			viewBox="0 0 360 220"
			preserveAspectRatio="xMidYMax slice"
			aria-hidden="true"
		>
			<circle cx="180" cy="98" r="85" fill="#d9c5ff" opacity=".08" />
			<circle
				cx="180"
				cy="98"
				r="66"
				fill="none"
				stroke="#d9c5ff"
				strokeDasharray="2 10"
				opacity=".22"
			/>
			<g fill="#ffe6a8">
				<path d="m45 48 2-7 2 7 7 2-7 2-2 7-2-7-7-2Zm261-13 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" />
				<circle cx="76" cy="94" r="2" />
				<circle cx="289" cy="111" r="2" />
				<circle cx="252" cy="22" r="2" />
			</g>
			<path
				d="m0 178 41-62 49 66 36-38 55 56 65-57 36 28 46-79 32 49v79H0Z"
				fill="#716a9a"
			/>
			<path d="m307 127 21-35 17 26-15-7Z" fill="#b9afce" />
			<path d="M0 206q97-37 180 2t180-11v23H0Z" fill="#4b507a" />
			<ellipse cx="180" cy="211" rx="112" ry="17" fill="#313554" />
			<ellipse cx="180" cy="204" rx="112" ry="15" fill="#91c9c1" />
			<path
				d="M69 205q111 24 222 0"
				fill="none"
				stroke="#65a5a3"
				strokeWidth="3"
			/>
		</svg>
	)
}
