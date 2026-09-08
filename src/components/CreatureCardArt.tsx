// Small vector scenes keep the character sheet and its activities available offline.
export function CreatureCardArt({
	kind,
}: {
	kind: "habitat" | "portrait" | "wardrobe" | "expedition"
}) {
	if (kind === "portrait")
		return (
			<svg
				className="creature-habitat creature-habitat-portrait"
				viewBox="0 0 320 560"
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
			>
				<rect width="320" height="560" fill="#e5eee5" />
				<circle cx="160" cy="240" r="112" fill="#fff8dc" />
				<circle
					cx="160"
					cy="240"
					r="128"
					fill="none"
					stroke="#fffdf0"
					strokeDasharray="2 10"
					strokeWidth="2"
				/>
				<path d="M0 413Q76 330 154 390T320 378V560H0Z" fill="#bfd7cd" />
				<path d="M0 472Q120 383 229 457T320 441V560H0Z" fill="#94bcae" />
				<ellipse cx="160" cy="450" rx="103" ry="20" fill="#6a988955" />
				<ellipse cx="160" cy="439" rx="103" ry="20" fill="#e4edce" />
				<g fill="#6b9d8b">
					<path d="M28 466q-30-75-8-109 28 30 8 109Zm0 0q0-41 29-48 8 28-29 48Zm265 17q-24-60-5-83 22 30 5 83Zm0 0q-30-10-31-33 27-8 31 33Z" />
				</g>
				<g fill="#efd083">
					<path d="m45 146 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm224 171 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
					<circle cx="242" cy="115" r="3" />
					<circle cx="60" cy="491" r="4" />
					<circle cx="265" cy="477" r="3" />
				</g>
			</svg>
		)
	if (kind === "habitat")
		return (
			<svg
				className="creature-habitat creature-habitat-landscape"
				viewBox="0 0 440 280"
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
			>
				<rect width="440" height="280" fill="#e5eee5" />
				<circle cx="220" cy="112" r="91" fill="#fff8dc" />
				<circle
					cx="220"
					cy="112"
					r="108"
					fill="none"
					stroke="#fffdf0"
					strokeDasharray="2 10"
					strokeWidth="2"
				/>
				<path d="M0 204Q65 123 145 195T305 179T440 166V280H0Z" fill="#bfd7cd" />
				<path d="M0 238Q94 177 189 225T440 211V280H0Z" fill="#94bcae" />
				<ellipse cx="220" cy="236" rx="101" ry="18" fill="#6a988955" />
				<ellipse cx="220" cy="226" rx="101" ry="18" fill="#e4edce" />
				<g fill="#6b9d8b">
					<path d="M52 242q-26-64-4-95 24 29 4 95Zm0 0q-1-46 32-54 7 35-32 54Zm330 8q-29-56-6-88 26 31 6 88Zm-1-4q-30-4-31-31 30-8 31 31Z" />
				</g>
				<g fill="#fff4bf">
					<path d="m81 82 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm260 35 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
					<circle cx="322" cy="58" r="3" />
					<circle cx="114" cy="144" r="2" />
				</g>
				<g fill="#f4d58b">
					<circle cx="82" cy="240" r="4" />
					<circle cx="351" cy="252" r="4" />
					<circle cx="366" cy="239" r="3" />
				</g>
			</svg>
		)
	return (
		<svg
			viewBox="0 0 88 80"
			className="creature-activity-art"
			aria-hidden="true"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{kind === "wardrobe" ? (
				<>
					<path
						d="M18 14h49v55H18Z"
						fill="#b4a2d1"
						stroke="#85739f"
						strokeWidth="2"
					/>
					<path d="M22 18h20v47H22Zm24 0h17v47H46Z" fill="#e3d7ed" />
					<path
						d="M22 69v5m39-5v5M37 41h1m13 0h1"
						stroke="#85739f"
						strokeWidth="3"
					/>
					<path d="m38 31 8-16 10 17" fill="#74588e" />
					<ellipse cx="47" cy="32" rx="17" ry="5" fill="#9776ae" />
					<path d="m68 41 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#f5cd78" />
				</>
			) : (
				<>
					<path d="m5 60 19-36 20 36Zm35 0 19-46 24 46Z" fill="#a0c7b2" />
					<path d="m52 32 7-18 9 18-9-4Z" fill="#eef4dd" />
					<path
						d="M29 70V35q0-8 14-8t14 8v35Z"
						fill="#cb9d64"
						stroke="#986f46"
						strokeWidth="2"
					/>
					<path d="M37 28v-5q7-7 14 0v5" stroke="#986f46" strokeWidth="4" />
					<rect x="32" y="32" width="22" height="16" rx="6" fill="#e8c893" />
					<rect x="35" y="53" width="16" height="12" rx="3" fill="#e8c893" />
					<path d="M43 42v9" stroke="#986f46" strokeWidth="4" />
					<path d="m9 72 14-3m38 2 17 3" stroke="#7aa48f" strokeWidth="3" />
				</>
			)}
		</svg>
	)
}
