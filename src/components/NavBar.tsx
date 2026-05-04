import React from 'react';
import './NavBar.css';

type PageId = 'library' | 'queue' | 'party' | 'settings';

interface NavItem {
	id: PageId;
	label: string;
	icon: React.ReactNode;
}

const ICONS: NavItem[] = [
	{
		id: 'library',
		label: 'Library',
		icon: (
			<svg viewBox="0 0 24 24">
				<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 5h-2V4h-4v3H9v2h2v3h2V9h2V7z" />
			</svg>
		),
	},
	{
		id: 'queue',
		label: 'Queue',
		icon: (
			<svg viewBox="0 0 24 24">
				<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
			</svg>
		),
	},
	{
		id: 'party',
		label: 'Party',
		icon: (
			<svg viewBox="0 0 24 24">
				<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
			</svg>
		),
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: (
			<svg viewBox="0 0 24 24">
				<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
			</svg>
		),
	},
];

interface NavBarProps {
	landscape: boolean;
	activePage: PageId;
	onNavigate: (page: PageId) => void;
	queueToasts: number[];
}

export function NavBar({ landscape, activePage, onNavigate, queueToasts }: NavBarProps) {
	return (
		<nav className={`nav-bar${landscape ? ' nav-bar--landscape' : ''}`}>
			{ICONS.map((item) => (
				<button
					key={item.id}
					className={`nav-bar__item${activePage === item.id ? ' nav-bar__item--active' : ''}`}
					onClick={() => onNavigate(item.id)}
				>
					{item.icon}
					<span className="nav-bar__label">{item.label}</span>
					{item.id === 'queue' && queueToasts.map((id) => (
						<span key={id} className="nav-bar__toast">+1</span>
					))}
				</button>
			))}
		</nav>
	);
}
