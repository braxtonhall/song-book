import React, { useState, useCallback } from 'react';
import './CopyButton.css';

interface CopyButtonProps {
	text: string;
	disabled?: boolean;
	size?: 'sm' | 'md';
}

export function CopyButton({ text, disabled, size = 'sm' }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleClick = useCallback(() => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		});
	}, [text]);

	const classNames = [
		'copy-btn',
		size === 'md' ? 'copy-btn--md' : '',
		copied ? 'copy-btn--success' : '',
	].filter(Boolean).join(' ');

	return (
		<button
			className={classNames}
			onClick={handleClick}
			disabled={disabled}
		>
			{copied ? 'Copied!' : 'Copy'}
		</button>
	);
}
