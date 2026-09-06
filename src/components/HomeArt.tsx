// Decorative vector art shares the game's palette and stays available offline.
export function HomeArt({
	kind,
}: {
	kind: "landscape" | "collection" | "village" | "map" | "achievements"
}) {
	if (kind === "landscape") {
		return (
			<svg
				className="home-landscape"
				viewBox="0 0 440 300"
				preserveAspectRatio="xMidYMax slice"
				aria-hidden="true"
			>
				<circle cx="220" cy="139" r="103" fill="#ffffff" opacity=".08" />
				<circle
					cx="220"
					cy="139"
					r="78"
					fill="none"
					stroke="#ffffff"
					strokeDasharray="3 12"
					opacity=".2"
				/>
				<g fill="#ffe69b">
					<path d="m65 58 3 10 10 3-10 3-3 10-3-10-10-3 10-3Zm289 37 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" />
					<circle cx="124" cy="106" r="3" />
					<circle cx="304" cy="43" r="3" />
					<circle cx="385" cy="180" r="2" />
				</g>
				<path
					d="M0 236 58 142 115 241 159 195 229 266 310 176 359 216 409 134 440 193V300H0Z"
					fill="#9383dc"
				/>
				<path
					d="m35 181 23-39 26 45-26-12Zm350-5 24-42 20 38-21-11Z"
					fill="#d6ccff"
				/>
				<path d="M0 264Q100 222 209 266T440 244V300H0Z" fill="#504b99" />
				<ellipse cx="220" cy="268" rx="110" ry="22" fill="#333368" />
				<ellipse cx="220" cy="259" rx="110" ry="22" fill="#80d8c2" />
				<path
					d="M112 259q100 31 216 0"
					fill="none"
					stroke="#46ac9b"
					strokeWidth="5"
				/>
				<g fill="#b6f1d4">
					<path d="m36 272 8-20 7 20Zm334 10 9-23 8 23Z" />
					<ellipse cx="138" cy="256" rx="8" ry="3" />
					<ellipse cx="299" cy="257" rx="6" ry="3" />
				</g>
			</svg>
		)
	}
	return (
		<svg
			className="home-nav-art"
			viewBox="0 0 100 80"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{kind === "collection" && (
				<>
					<rect
						x="20"
						y="12"
						width="44"
						height="56"
						rx="10"
						fill="#d9ceff"
						stroke="#8870d3"
						strokeWidth="3"
						transform="rotate(-12 42 40)"
					/>
					<rect
						x="36"
						y="10"
						width="44"
						height="59"
						rx="10"
						fill="#faf6ff"
						stroke="#8870d3"
						strokeWidth="3"
						transform="rotate(9 58 40)"
					/>
					<path
						d="M43 47q-3-25 10-18l6 1q14-9 14 16 0 12-15 12T43 47Z"
						fill="#9e86f5"
					/>
					<g fill="#3c316f">
						<ellipse cx="52" cy="42" rx="2.5" ry="4" />
						<ellipse cx="65" cy="42" rx="2.5" ry="4" />
					</g>
					<path d="M55 50q4 4 7 0" stroke="#3c316f" strokeWidth="2" />
				</>
			)}
			{kind === "village" && (
				<>
					<ellipse cx="50" cy="68" rx="39" ry="7" fill="#96d7b6" />
					<path
						d="M29 35h42v31H29Z"
						fill="#fff2cc"
						stroke="#a77a56"
						strokeWidth="3"
					/>
					<path
						d="m21 36 29-25 30 25Z"
						fill="#ef9c76"
						stroke="#bd685e"
						strokeWidth="3"
					/>
					<path d="M44 66V49q6-8 12 0v17" fill="#ab80b0" />
					<path d="M65 22V12h7v16" fill="#bd685e" />
					<path
						d="M17 63V43m-6 10 6-14 7 14"
						stroke="#499779"
						strokeWidth="5"
					/>
					<rect x="32" y="41" width="8" height="9" rx="2" fill="#82cbd0" />
				</>
			)}
			{kind === "map" && (
				<>
					<path
						d="m13 20 24-7 27 8 23-8v49l-23 7-27-8-24 7Z"
						fill="#f7edcc"
						stroke="#b6a373"
						strokeWidth="3"
					/>
					<path d="M37 15v45m27-37v44" stroke="#dfcea3" strokeWidth="2" />
					<path
						d="m24 52 15-15 17 9 18-16"
						stroke="#c27b63"
						strokeWidth="3"
						strokeDasharray="3 5"
					/>
					<path d="m63 30 11-17 11 17Z" fill="#75baa6" />
					<circle cx="25" cy="52" r="4" fill="#c27b63" />
					<path d="m50 29 3-5 3 5" stroke="#75baa6" strokeWidth="3" />
				</>
			)}
			{kind === "achievements" && (
				<>
					<path
						d="M32 19H20v13q0 16 19 16m29-29h12v13q0 16-19 16"
						stroke="#cc913e"
						strokeWidth="6"
					/>
					<path
						d="M31 13h38v20q0 22-19 22T31 33Z"
						fill="#f4c65b"
						stroke="#cc913e"
						strokeWidth="3"
					/>
					<path d="M50 55v12m-15 2h30" stroke="#cc913e" strokeWidth="6" />
					<path
						d="m50 22 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z"
						fill="#fff7d6"
					/>
				</>
			)}
		</svg>
	)
}
