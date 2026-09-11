# Minutiae

Obsidian 편의 기능(QoL) 모음 플러그인.

## 기능

- **코드 블록 단계별 전체 선택**: 코드 블록 내 `Cmd/Ctrl + A` 입력 시 `내용` → `블록 전체` → `문서 전체` 순으로 선택 확장.

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
