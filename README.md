# Minutiae

Obsidian 편의 기능(QoL) 모음 플러그인.

## 기능

- **코드 블록 단계별 전체 선택**: 코드 블록 내 `Cmd/Ctrl + A` 입력 시 `내용` → `블록 전체` → `문서 전체` 순으로 선택 확장.
- **표 넓게 보기**: 본문 폭과 작은 표의 원래 너비·위치는 유지하고, 본문보다 넓은 표만 필요한 너비로 확장해 중앙에 표시. 패널보다 큰 표는 표 안에서 가로 스크롤. 읽기 모드와 라이브 프리뷰에서 지원하며, `설정 → Minutiae → Wide tables`에서 즉시 켜거나 끌 수 있음(기본 켜짐). Obsidian의 `읽기 쉬운 줄 길이`가 켜져 있을 때 적용되며, 원본 마크다운은 변경하지 않음.

## 개발 및 테스트

```bash
# 단위 테스트
bun test

# 타입 검사
bun run typecheck

# 빌드 (Watch)
bun run dev

# 프로덕션 빌드
bun run build
```

### 보관함(Vault) 연동

빌드 결과물(`dist/`)을 볼트 플러그인 경로로 복사:

```bash
# 기본 경로 (~/note/dev/.obsidian/plugins/minutiae)
bun run deploy

# 볼트 이름만 지정 (~/note/work/.obsidian/plugins/minutiae)
bun run deploy work

# 전체 경로 지정 (~ 또는 / 시작)
bun run deploy ~/custom/vault/.obsidian/plugins/minutiae
bun run deploy /path/to/vault/.obsidian/plugins/minutiae
```
