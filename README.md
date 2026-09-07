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

### 보관함(Vault) 연동 테스트

볼트 플러그인 경로에 심볼릭 링크 생성 후 `bun run dev`:

```bash
ln -s "$(pwd)" /path/to/vault/.obsidian/plugins/minutiae
```
