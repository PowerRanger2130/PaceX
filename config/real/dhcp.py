from __future__ import annotations

import argparse
import re
from pathlib import Path


# Keep these public IPs up to date.
# Key format: <SiteRouter>, for example: S1R1, S2R2, S3R1
PUBLIC_IPS: dict[str, str] = {
	"S1R1": "10.224.55.37",
	"S1R2": "10.224.55.38",
	"S2R1": "10.224.55.35",
	"S3R1": "10.224.55.36",
}


TUNNEL_DEST_RE = re.compile(
	r"^(?P<prefix>\s*(?:tun(?:nel)?\s+dest(?:ination)?)\s+)"
	r"(?P<ip>\d{1,3}(?:\.\d{1,3}){3})"
	r"(?P<suffix>.*)$",
	re.IGNORECASE,
)
INLINE_TUNNEL_TO_RE = re.compile(r"!\s*Tunnel\s+to\s+([A-Za-z0-9_-]+)", re.IGNORECASE)
TUNNEL_TO_LINE_RE = re.compile(r"^\s*!\s*Tunnel\s+to\s+([A-Za-z0-9_-]+)\s*$", re.IGNORECASE)
LABEL_COMMENT_RE = re.compile(r"^\s*!\s*([A-Za-z]\dR\d)\s*$", re.IGNORECASE)


def normalize_label(label: str) -> str:
	return label.strip().upper()


def update_ios_content(content: str, ip_map: dict[str, str]) -> tuple[str, int, list[str]]:
	lines = content.splitlines(keepends=True)
	updated_lines: list[str] = []
	pending_label: str | None = None
	replacements = 0
	warnings: list[str] = []

	for line_number, line in enumerate(lines, start=1):
		tunnel_to_line_match = TUNNEL_TO_LINE_RE.match(line)
		if tunnel_to_line_match:
			pending_label = normalize_label(tunnel_to_line_match.group(1))
			updated_lines.append(line)
			continue

		label_match = LABEL_COMMENT_RE.match(line)
		if label_match:
			pending_label = normalize_label(label_match.group(1))
			updated_lines.append(line)
			continue

		tunnel_match = TUNNEL_DEST_RE.match(line)
		if not tunnel_match:
			updated_lines.append(line)
			continue

		prefix = tunnel_match.group("prefix")
		current_ip = tunnel_match.group("ip")
		suffix = tunnel_match.group("suffix")

		inline_label_match = INLINE_TUNNEL_TO_RE.search(suffix)
		label = normalize_label(inline_label_match.group(1)) if inline_label_match else pending_label

		if not label:
			warnings.append(
				f"Line {line_number}: tunnel destination has no router label comment; left unchanged."
			)
			updated_lines.append(line)
			continue

		desired_ip = ip_map.get(label)
		if desired_ip is None:
			warnings.append(
				f"Line {line_number}: no PUBLIC_IPS entry for {label}; kept {current_ip}."
			)
			desired_ip = current_ip

		line_ending = "\r\n" if line.endswith("\r\n") else "\n"
		indent_match = re.match(r"^\s*", prefix)
		comment_indent = indent_match.group(0) if indent_match else ""
		marker_line = f"{comment_indent}! Tunnel to {label}{line_ending}"

		clean_suffix = INLINE_TUNNEL_TO_RE.sub("", suffix).rstrip()
		rebuilt = f"{prefix}{desired_ip}"
		if clean_suffix:
			rebuilt = f"{rebuilt}{clean_suffix}"
		rebuilt = f"{rebuilt}{line_ending}"

		has_marker_before = bool(
			updated_lines
			and updated_lines[-1].strip().lower() == f"! tunnel to {label.lower()}"
		)

		if (not has_marker_before) or (rebuilt != line):
			replacements += 1

		if not has_marker_before:
			updated_lines.append(marker_line)
		updated_lines.append(rebuilt)
		pending_label = None

	return "".join(updated_lines), replacements, warnings


def iter_ios_files(root: Path) -> list[Path]:
	return sorted(root.glob("S*/**/*.ios"))


def process_files(root: Path, write: bool) -> int:
	ios_files = iter_ios_files(root)
	if not ios_files:
		print(f"No IOS files found under: {root}")
		return 0

	total_replacements = 0
	files_changed = 0

	for ios_file in ios_files:
		original = ios_file.read_text(encoding="utf-8")
		updated, replacements, warnings = update_ios_content(original, PUBLIC_IPS)

		for warning in warnings:
			print(f"[WARN] {ios_file}: {warning}")

		if replacements == 0:
			continue

		total_replacements += replacements
		files_changed += 1

		if write:
			ios_file.write_text(updated, encoding="utf-8")

		action = "UPDATED" if write else "WOULD UPDATE"
		print(f"[{action}] {ios_file} ({replacements} tunnel line(s))")

	summary_action = "Applied" if write else "Planned"
	print(
		f"{summary_action} {total_replacements} tunnel destination update(s) "
		f"across {files_changed} file(s)."
	)
	return total_replacements


def main() -> None:
	parser = argparse.ArgumentParser(
		description=(
			"Update tunnel destination IPs in IOS configs based on PUBLIC_IPS and "
			"'! Tunnel to <ROUTER>' comments placed on the previous line."
		)
	)
	parser.add_argument(
		"--root",
		type=Path,
		default=Path(__file__).resolve().parent,
		help="Root folder containing S1/S2/S3 directories (default: current script folder)",
	)
	parser.add_argument(
		"--dry-run",
		action="store_true",
		help="Show what would change without modifying files.",
	)
	args = parser.parse_args()

	process_files(args.root, write=not args.dry_run)


if __name__ == "__main__":
	main()
