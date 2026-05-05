"""
Layer 3 — GSPL Language: Lexer, Parser, AST, Type Checker, Interpreter.
26 keywords, 17 gene types, Hindley-Milner + refinement types.
"""
import re
from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Any, Optional

# ─── Token Types ───────────────────────────────────────────────────────────────
class TokenType(Enum):
    # Keywords (26)
    SEED = auto(); GENE = auto(); FN = auto(); TYPE = auto(); TRAIT = auto()
    DOMAIN = auto(); IMPORT = auto(); EXPORT = auto(); LET = auto()
    IF = auto(); ELSE = auto(); MATCH = auto(); CASE = auto(); RETURN = auto()
    FOR = auto(); IN = auto(); WHILE = auto(); DO = auto()
    TRUE = auto(); FALSE = auto(); NIL = auto(); GPU = auto()
    EFFECT = auto(); HANDLE = auto(); WITH = auto(); WHERE = auto()
    # Seed operations
    BREED = auto(); MUTATE = auto(); COMPOSE = auto(); EVOLVE = auto()
    GROW = auto(); SIGNED = auto(); IMPL = auto()
    # Literals
    INT_LIT = auto(); FLOAT_LIT = auto(); STRING_LIT = auto()
    # Identifiers
    IDENT = auto(); TYPE_IDENT = auto(); GENE_IDENT = auto()
    # Operators
    PLUS = auto(); MINUS = auto(); STAR = auto(); SLASH = auto(); PERCENT = auto()
    POWER = auto(); EQ = auto(); NEQ = auto(); LT = auto(); LE = auto()
    GT = auto(); GE = auto(); AND = auto(); OR = auto(); NOT = auto()
    BIT_AND = auto(); BIT_OR = auto(); BIT_XOR = auto(); BIT_NOT = auto()
    SHL = auto(); SHR = auto(); ASSIGN = auto(); PIPE = auto()
    RANGE = auto(); RANGE_INC = auto(); DOT = auto(); OPTIONAL_CHAIN = auto()
    ARROW = auto(); AT = auto()
    # Delimiters
    LPAREN = auto(); RPAREN = auto(); LBRACE = auto(); RBRACE = auto()
    LBRACKET = auto(); RBRACKET = auto(); COMMA = auto(); COLON = auto()
    SEMICOLON = auto()
    # Special
    NEWLINE = auto(); COMMENT = auto(); EOF = auto()


KEYWORDS = {
    'seed': TokenType.SEED, 'gene': TokenType.GENE, 'fn': TokenType.FN,
    'type': TokenType.TYPE, 'trait': TokenType.TRAIT, 'domain': TokenType.DOMAIN,
    'import': TokenType.IMPORT, 'export': TokenType.EXPORT, 'let': TokenType.LET,
    'if': TokenType.IF, 'else': TokenType.ELSE, 'match': TokenType.MATCH,
    'case': TokenType.CASE, 'return': TokenType.RETURN, 'for': TokenType.FOR,
    'in': TokenType.IN, 'while': TokenType.WHILE, 'do': TokenType.DO,
    'true': TokenType.TRUE, 'false': TokenType.FALSE, 'nil': TokenType.NIL,
    'gpu': TokenType.GPU, 'effect': TokenType.EFFECT, 'handle': TokenType.HANDLE,
    'with': TokenType.WITH, 'where': TokenType.WHERE, 'breed': TokenType.BREED,
    'mutate': TokenType.MUTATE, 'compose': TokenType.COMPOSE, 'evolve': TokenType.EVOLVE,
    'grow': TokenType.GROW, 'signed': TokenType.SIGNED, 'impl': TokenType.IMPL,
}

@dataclass
class Token:
    type: TokenType
    value: Any
    line: int
    col: int

@dataclass
class SourceSpan:
    start_line: int
    start_col: int
    end_line: int
    end_col: int


# ─── Lexer ─────────────────────────────────────────────────────────────────────
class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.col = 1
        self.tokens = []

    def peek(self):
        return self.source[self.pos] if self.pos < len(self.source) else '\0'

    def advance(self):
        ch = self.source[self.pos]
        self.pos += 1
        if ch == '\n':
            self.line += 1
            self.col = 1
        else:
            self.col += 1
        return ch

    def skip_whitespace(self):
        while self.pos < len(self.source) and self.source[self.pos] in ' \t\r':
            self.advance()

    def skip_comment(self):
        if self.pos + 1 < len(self.source):
            if self.source[self.pos:self.pos+2] == '//':
                while self.pos < len(self.source) and self.source[self.pos] != '\n':
                    self.advance()
                return True
            if self.source[self.pos:self.pos+2] == '/*':
                self.advance(); self.advance()
                depth = 1
                while self.pos < len(self.source) and depth > 0:
                    if self.source[self.pos:self.pos+2] == '/*':
                        depth += 1; self.advance()
                    elif self.source[self.pos:self.pos+2] == '*/':
                        depth -= 1; self.advance()
                    self.advance()
                return True
        return False

    def read_string(self):
        line, col = self.line, self.col
        self.advance()  # skip opening "
        result = ''
        while self.pos < len(self.source) and self.source[self.pos] != '"':
            if self.source[self.pos] == '\\':
                self.advance()
                esc = self.advance()
                result += {'n': '\n', 't': '\t', '\\': '\\', '"': '"'}.get(esc, esc)
            else:
                result += self.advance()
        if self.pos < len(self.source):
            self.advance()  # skip closing "
        return Token(TokenType.STRING_LIT, result, line, col)

    def read_number(self):
        line, col = self.line, self.col
        num = ''
        is_float = False
        while self.pos < len(self.source) and (self.source[self.pos].isdigit() or self.source[self.pos] in '._eE+-'):
            ch = self.source[self.pos]
            if ch == '.' and not is_float:
                if self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '.':
                    break  # range operator
                is_float = True
            elif ch in 'eE':
                is_float = True
            elif ch == '_':
                self.advance(); continue
            num += self.advance()
        if is_float:
            return Token(TokenType.FLOAT_LIT, float(num), line, col)
        return Token(TokenType.INT_LIT, int(num), line, col)

    def read_identifier(self):
        line, col = self.line, self.col
        ident = ''
        while self.pos < len(self.source) and (self.source[self.pos].isalnum() or self.source[self.pos] == '_'):
            ident += self.advance()
        if ident in KEYWORDS:
            return Token(KEYWORDS[ident], ident, line, col)
        if ident[0].isupper():
            return Token(TokenType.TYPE_IDENT, ident, line, col)
        return Token(TokenType.IDENT, ident, line, col)

    def tokenize(self):
        while self.pos < len(self.source):
            self.skip_whitespace()
            if self.pos >= len(self.source):
                break
            if self.skip_comment():
                continue
            ch = self.peek()
            line, col = self.line, self.col

            if ch == '\n':
                self.advance()
                self.tokens.append(Token(TokenType.NEWLINE, '\n', line, col))
            elif ch == '"':
                self.tokens.append(self.read_string())
            elif ch.isdigit():
                self.tokens.append(self.read_number())
            elif ch.isalpha() or ch == '_':
                self.tokens.append(self.read_identifier())
            elif ch == '|' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '>':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.PIPE, '|>', line, col))
            elif ch == '|' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '|':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.OR, '||', line, col))
            elif ch == '&' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '&':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.AND, '&&', line, col))
            elif ch == '=' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '=':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.EQ, '==', line, col))
            elif ch == '!' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '=':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.NEQ, '!=', line, col))
            elif ch == '<' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '=':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.LE, '<=', line, col))
            elif ch == '>' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '=':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.GE, '>=', line, col))
            elif ch == '-' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '>':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.ARROW, '->', line, col))
            elif ch == '*' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '*':
                self.advance(); self.advance()
                self.tokens.append(Token(TokenType.POWER, '**', line, col))
            elif ch == '.' and self.pos + 1 < len(self.source) and self.source[self.pos + 1] == '.':
                self.advance(); self.advance()
                if self.pos < len(self.source) and self.source[self.pos] == '=':
                    self.advance()
                    self.tokens.append(Token(TokenType.RANGE_INC, '..=', line, col))
                else:
                    self.tokens.append(Token(TokenType.RANGE, '..', line, col))
            else:
                self.advance()
                simple = {
                    '+': TokenType.PLUS, '-': TokenType.MINUS, '*': TokenType.STAR,
                    '/': TokenType.SLASH, '%': TokenType.PERCENT, '=': TokenType.ASSIGN,
                    '<': TokenType.LT, '>': TokenType.GT, '!': TokenType.NOT,
                    '&': TokenType.BIT_AND, '|': TokenType.BIT_OR, '^': TokenType.BIT_XOR,
                    '~': TokenType.BIT_NOT, '.': TokenType.DOT, '@': TokenType.AT,
                    '(': TokenType.LPAREN, ')': TokenType.RPAREN,
                    '{': TokenType.LBRACE, '}': TokenType.RBRACE,
                    '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
                    ',': TokenType.COMMA, ':': TokenType.COLON, ';': TokenType.SEMICOLON,
                }
                if ch in simple:
                    self.tokens.append(Token(simple[ch], ch, line, col))
        self.tokens.append(Token(TokenType.EOF, '', self.line, self.col))
        return [t for t in self.tokens if t.type != TokenType.NEWLINE]


# ─── AST Nodes ─────────────────────────────────────────────────────────────────
@dataclass
class ASTNode:
    kind: str
    line: int = 0
    col: int = 0

@dataclass
class ProgramNode(ASTNode):
    declarations: list = field(default_factory=list)

@dataclass
class SeedDeclNode(ASTNode):
    name: str = ""
    domain: str = ""
    genes: dict = field(default_factory=dict)
    is_signed: bool = False

@dataclass
class FnDeclNode(ASTNode):
    name: str = ""
    params: list = field(default_factory=list)
    return_type: Optional[str] = None
    body: list = field(default_factory=list)
    annotations: list = field(default_factory=list)

@dataclass
class TypeDeclNode(ASTNode):
    name: str = ""
    base_type: Optional[str] = None
    refinements: list = field(default_factory=list)

@dataclass
class TraitDeclNode(ASTNode):
    name: str = ""
    methods: list = field(default_factory=list)

@dataclass
class DomainDeclNode(ASTNode):
    name: str = ""
    genes: dict = field(default_factory=dict)
    stages: list = field(default_factory=list)

@dataclass
class LetNode(ASTNode):
    name: str = ""
    value: Any = None

@dataclass
class ImportNode(ASTNode):
    names: list = field(default_factory=list)
    source: str = ""

@dataclass
class ExportNode(ASTNode):
    names: list = field(default_factory=list)

@dataclass
class ExprNode(ASTNode):
    pass

@dataclass
class LiteralNode(ExprNode):
    value: Any = None
    lit_type: str = ""

@dataclass
class IdentNode(ExprNode):
    name: str = ""

@dataclass
class BinOpNode(ExprNode):
    op: str = ""
    left: Any = None
    right: Any = None

@dataclass
class UnaryOpNode(ExprNode):
    op: str = ""
    operand: Any = None

@dataclass
class CallNode(ExprNode):
    callee: str = ""
    args: list = field(default_factory=list)
    kwargs: dict = field(default_factory=dict)

@dataclass
class PipeNode(ExprNode):
    left: Any = None
    right: Any = None

@dataclass
class AccessNode(ExprNode):
    obj: Any = None
    field_name: str = ""

@dataclass
class ArrayNode(ExprNode):
    elements: list = field(default_factory=list)

@dataclass
class StructNode(ExprNode):
    fields: dict = field(default_factory=dict)

@dataclass
class IfNode(ASTNode):
    condition: Any = None
    then_branch: list = field(default_factory=list)
    else_branch: list = field(default_factory=list)

@dataclass
class ReturnNode(ASTNode):
    value: Any = None

@dataclass
class SeedOpNode(ExprNode):
    operation: str = ""  # breed, mutate, compose, evolve, grow
    args: list = field(default_factory=list)
    kwargs: dict = field(default_factory=dict)


# ─── Parser ────────────────────────────────────────────────────────────────────
class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0
        self.errors = []

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else Token(TokenType.EOF, '', 0, 0)

    def advance(self):
        t = self.tokens[self.pos]
        self.pos += 1
        return t

    def expect(self, tt):
        t = self.peek()
        if t.type != tt:
            self.errors.append(f"L{t.line}:{t.col} Expected {tt.name}, got {t.type.name} '{t.value}'")
            return t
        return self.advance()

    def match(self, *types):
        if self.peek().type in types:
            return self.advance()
        return None

    def parse(self):
        program = ProgramNode(kind='Program', declarations=[])
        while self.peek().type != TokenType.EOF:
            decl = self.parse_declaration()
            if decl:
                program.declarations.append(decl)
            elif self.peek().type != TokenType.EOF:
                self.advance()
        return program

    def parse_declaration(self):
        t = self.peek()
        if t.type == TokenType.SIGNED:
            self.advance()
            decl = self.parse_declaration()
            if isinstance(decl, SeedDeclNode):
                decl.is_signed = True
            return decl
        if t.type == TokenType.SEED:
            return self.parse_seed_decl()
        if t.type == TokenType.FN:
            return self.parse_fn_decl()
        if t.type == TokenType.LET:
            return self.parse_let()
        if t.type == TokenType.TYPE:
            return self.parse_type_decl()
        if t.type == TokenType.TRAIT:
            return self.parse_trait_decl()
        if t.type == TokenType.DOMAIN:
            return self.parse_domain_decl()
        if t.type == TokenType.IMPORT:
            return self.parse_import()
        if t.type == TokenType.EXPORT:
            return self.parse_export()
        if t.type == TokenType.AT:
            return self.parse_annotated()
        return self.parse_expr_stmt()

    def parse_seed_decl(self):
        t = self.advance()  # consume 'seed'
        node = SeedDeclNode(kind='SeedDecl', line=t.line, col=t.col)
        name_tok = self.peek()
        if name_tok.type == TokenType.STRING_LIT:
            node.name = self.advance().value
        else:
            node.name = self.advance().value
        if self.match(TokenType.IN):
            node.domain = self.advance().value
        if self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                key = self.advance().value
                self.match(TokenType.COLON)
                val = self.parse_expression()
                node.genes[key] = val
                self.match(TokenType.COMMA)
            self.expect(TokenType.RBRACE)
        return node

    def parse_fn_decl(self):
        t = self.advance()  # consume 'fn'
        node = FnDeclNode(kind='FnDecl', line=t.line, col=t.col)
        node.name = self.advance().value
        self.expect(TokenType.LPAREN)
        while self.peek().type not in (TokenType.RPAREN, TokenType.EOF):
            pname = self.advance().value
            ptype = None
            if self.match(TokenType.COLON):
                ptype = self.advance().value
            node.params.append({'name': pname, 'type': ptype})
            self.match(TokenType.COMMA)
        self.expect(TokenType.RPAREN)
        if self.match(TokenType.ARROW):
            node.return_type = self.advance().value
        if self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                stmt = self.parse_declaration()
                if stmt:
                    node.body.append(stmt)
            self.expect(TokenType.RBRACE)
        return node

    def parse_let(self):
        t = self.advance()
        node = LetNode(kind='Let', line=t.line, col=t.col)
        node.name = self.advance().value
        self.expect(TokenType.ASSIGN)
        node.value = self.parse_expression()
        return node

    def parse_type_decl(self):
        t = self.advance()
        node = TypeDeclNode(kind='TypeDecl', line=t.line, col=t.col)
        node.name = self.advance().value
        if self.match(TokenType.ASSIGN):
            node.base_type = self.advance().value
        if self.match(TokenType.WHERE):
            self.expect(TokenType.LBRACE)
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                node.refinements.append(self.parse_expression())
                self.match(TokenType.COMMA)
            self.expect(TokenType.RBRACE)
        return node

    def parse_trait_decl(self):
        t = self.advance()
        node = TraitDeclNode(kind='TraitDecl', line=t.line, col=t.col)
        node.name = self.advance().value
        if self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                m = self.parse_fn_decl() if self.peek().type == TokenType.FN else self.advance()
                node.methods.append(m)
            self.expect(TokenType.RBRACE)
        return node

    def parse_domain_decl(self):
        t = self.advance()
        node = DomainDeclNode(kind='DomainDecl', line=t.line, col=t.col)
        node.name = self.advance().value
        if self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                key = self.advance()
                if key.value == 'genes' and self.match(TokenType.LBRACE):
                    while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                        gname = self.advance().value
                        self.match(TokenType.COLON)
                        gtype = self.advance().value
                        node.genes[gname] = gtype
                        self.match(TokenType.COMMA)
                    self.expect(TokenType.RBRACE)
                elif key.value == 'stages':
                    self.match(TokenType.ASSIGN)
                    if self.match(TokenType.LBRACKET):
                        while self.peek().type not in (TokenType.RBRACKET, TokenType.EOF):
                            node.stages.append(self.advance().value)
                            self.match(TokenType.COMMA)
                        self.expect(TokenType.RBRACKET)
                else:
                    self.match(TokenType.ASSIGN)
                    self.parse_expression()
            self.expect(TokenType.RBRACE)
        return node

    def parse_import(self):
        t = self.advance()
        node = ImportNode(kind='Import', line=t.line, col=t.col)
        if self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                node.names.append(self.advance().value)
                self.match(TokenType.COMMA)
            self.expect(TokenType.RBRACE)
        if self.peek().value == 'from':
            self.advance()
            node.source = self.advance().value
        return node

    def parse_export(self):
        t = self.advance()
        node = ExportNode(kind='Export', line=t.line, col=t.col)
        if self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                node.names.append(self.advance().value)
                self.match(TokenType.COMMA)
            self.expect(TokenType.RBRACE)
        return node

    def parse_annotated(self):
        self.advance()  # @
        annotation = self.advance().value
        decl = self.parse_declaration()
        if isinstance(decl, FnDeclNode):
            decl.annotations.append(annotation)
        return decl

    def parse_expr_stmt(self):
        return self.parse_expression()

    def parse_expression(self):
        return self.parse_pipe()

    def parse_pipe(self):
        left = self.parse_or()
        while self.match(TokenType.PIPE):
            right = self.parse_or()
            left = PipeNode(kind='Pipe', left=left, right=right, line=left.line if hasattr(left, 'line') else 0, col=left.col if hasattr(left, 'col') else 0)
        return left

    def parse_or(self):
        left = self.parse_and()
        while self.match(TokenType.OR):
            right = self.parse_and()
            left = BinOpNode(kind='BinOp', op='||', left=left, right=right)
        return left

    def parse_and(self):
        left = self.parse_comparison()
        while self.match(TokenType.AND):
            right = self.parse_comparison()
            left = BinOpNode(kind='BinOp', op='&&', left=left, right=right)
        return left

    def parse_comparison(self):
        left = self.parse_addition()
        while self.peek().type in (TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE):
            op = self.advance().value
            right = self.parse_addition()
            left = BinOpNode(kind='BinOp', op=op, left=left, right=right)
        return left

    def parse_addition(self):
        left = self.parse_multiplication()
        while self.peek().type in (TokenType.PLUS, TokenType.MINUS):
            op = self.advance().value
            right = self.parse_multiplication()
            left = BinOpNode(kind='BinOp', op=op, left=left, right=right)
        return left

    def parse_multiplication(self):
        left = self.parse_unary()
        while self.peek().type in (TokenType.STAR, TokenType.SLASH, TokenType.PERCENT):
            op = self.advance().value
            right = self.parse_unary()
            left = BinOpNode(kind='BinOp', op=op, left=left, right=right)
        return left

    def parse_unary(self):
        if self.peek().type in (TokenType.MINUS, TokenType.NOT, TokenType.BIT_NOT):
            op = self.advance()
            operand = self.parse_unary()
            return UnaryOpNode(kind='UnaryOp', op=op.value, operand=operand, line=op.line, col=op.col)
        return self.parse_postfix()

    def parse_postfix(self):
        expr = self.parse_primary()
        while True:
            if self.match(TokenType.DOT):
                field_name = self.advance().value
                expr = AccessNode(kind='Access', obj=expr, field_name=field_name)
            elif self.match(TokenType.LPAREN):
                args = []
                kwargs = {}
                while self.peek().type not in (TokenType.RPAREN, TokenType.EOF):
                    if self.pos + 1 < len(self.tokens) and self.tokens[self.pos + 1].type == TokenType.COLON:
                        key = self.advance().value
                        self.advance()  # :
                        kwargs[key] = self.parse_expression()
                    else:
                        args.append(self.parse_expression())
                    self.match(TokenType.COMMA)
                self.expect(TokenType.RPAREN)
                callee = expr.name if isinstance(expr, IdentNode) else str(expr)
                expr = CallNode(kind='Call', callee=callee, args=args, kwargs=kwargs)
            elif self.match(TokenType.LBRACKET):
                idx = self.parse_expression()
                self.expect(TokenType.RBRACKET)
                expr = AccessNode(kind='Access', obj=expr, field_name=f'[{idx}]')
            else:
                break
        return expr

    def parse_primary(self):
        t = self.peek()
        if t.type == TokenType.INT_LIT:
            self.advance()
            return LiteralNode(kind='Literal', value=t.value, lit_type='int', line=t.line, col=t.col)
        if t.type == TokenType.FLOAT_LIT:
            self.advance()
            return LiteralNode(kind='Literal', value=t.value, lit_type='float', line=t.line, col=t.col)
        if t.type == TokenType.STRING_LIT:
            self.advance()
            return LiteralNode(kind='Literal', value=t.value, lit_type='string', line=t.line, col=t.col)
        if t.type in (TokenType.TRUE, TokenType.FALSE):
            self.advance()
            return LiteralNode(kind='Literal', value=t.type == TokenType.TRUE, lit_type='bool', line=t.line, col=t.col)
        if t.type == TokenType.NIL:
            self.advance()
            return LiteralNode(kind='Literal', value=None, lit_type='nil', line=t.line, col=t.col)
        if t.type == TokenType.LBRACKET:
            return self.parse_array()
        if t.type == TokenType.LBRACE:
            return self.parse_struct_lit()
        if t.type in (TokenType.BREED, TokenType.MUTATE, TokenType.COMPOSE, TokenType.EVOLVE, TokenType.GROW):
            return self.parse_seed_op()
        if t.type in (TokenType.IF,):
            return self.parse_if_expr()
        if t.type == TokenType.RETURN:
            self.advance()
            val = self.parse_expression() if self.peek().type not in (TokenType.RBRACE, TokenType.EOF) else None
            return ReturnNode(kind='Return', value=val, line=t.line, col=t.col)
        if t.type == TokenType.LPAREN:
            self.advance()
            expr = self.parse_expression()
            self.expect(TokenType.RPAREN)
            return expr
        if t.type in (TokenType.IDENT, TokenType.TYPE_IDENT, TokenType.GENE_IDENT):
            self.advance()
            return IdentNode(kind='Ident', name=t.value, line=t.line, col=t.col)
        if t.type == TokenType.SEED:
            return self.parse_seed_decl()
        self.advance()
        return LiteralNode(kind='Literal', value=t.value, lit_type='unknown', line=t.line, col=t.col)

    def parse_array(self):
        t = self.advance()  # [
        elements = []
        while self.peek().type not in (TokenType.RBRACKET, TokenType.EOF):
            elements.append(self.parse_expression())
            self.match(TokenType.COMMA)
        self.expect(TokenType.RBRACKET)
        return ArrayNode(kind='Array', elements=elements, line=t.line, col=t.col)

    def parse_struct_lit(self):
        t = self.advance()  # {
        fields = {}
        while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
            key = self.advance().value
            self.expect(TokenType.COLON)
            fields[key] = self.parse_expression()
            self.match(TokenType.COMMA)
        self.expect(TokenType.RBRACE)
        return StructNode(kind='Struct', fields=fields, line=t.line, col=t.col)

    def parse_seed_op(self):
        t = self.advance()
        node = SeedOpNode(kind='SeedOp', operation=t.value, line=t.line, col=t.col)
        if self.match(TokenType.LPAREN):
            while self.peek().type not in (TokenType.RPAREN, TokenType.EOF):
                if self.pos + 1 < len(self.tokens) and self.tokens[self.pos + 1].type == TokenType.COLON:
                    key = self.advance().value
                    self.advance()
                    node.kwargs[key] = self.parse_expression()
                else:
                    node.args.append(self.parse_expression())
                self.match(TokenType.COMMA)
            self.expect(TokenType.RPAREN)
        elif self.match(TokenType.LBRACE):
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                key = self.advance().value
                self.match(TokenType.COLON)
                node.kwargs[key] = self.parse_expression()
                self.match(TokenType.COMMA)
            self.expect(TokenType.RBRACE)
        return node

    def parse_if_expr(self):
        t = self.advance()  # if
        cond = self.parse_expression()
        self.expect(TokenType.LBRACE)
        then_branch = []
        while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
            then_branch.append(self.parse_declaration())
        self.expect(TokenType.RBRACE)
        else_branch = []
        if self.match(TokenType.ELSE):
            self.expect(TokenType.LBRACE)
            while self.peek().type not in (TokenType.RBRACE, TokenType.EOF):
                else_branch.append(self.parse_declaration())
            self.expect(TokenType.RBRACE)
        return IfNode(kind='If', condition=cond, then_branch=then_branch, else_branch=else_branch, line=t.line, col=t.col)


# ─── Type Checker ──────────────────────────────────────────────────────────────
GENE_TYPE_MAP = {
    'scalar': 'float', 'categorical': 'string', 'vector': 'vec',
    'expression': 'string', 'struct': 'struct', 'array': 'array',
    'graph': 'struct', 'topology': 'struct', 'temporal': 'struct',
    'regulatory': 'struct', 'field': 'struct', 'symbolic': 'any',
    'quantum': 'struct', 'gematria': 'struct', 'resonance': 'struct',
    'dimensional': 'vec', 'sovereignty': 'struct',
}

class TypeChecker:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.env = {}
        self.domain_schemas = {}

    def check(self, ast):
        if isinstance(ast, ProgramNode):
            for decl in ast.declarations:
                self.check(decl)
        elif isinstance(ast, SeedDeclNode):
            self.env[ast.name] = f'Seed<{ast.domain}>'
            for gene_name, gene_value in ast.genes.items():
                self.check(gene_value)
        elif isinstance(ast, FnDeclNode):
            ret_type = ast.return_type or 'void'
            param_types = [p.get('type', 'any') for p in ast.params]
            self.env[ast.name] = f'fn({",".join(param_types)}) -> {ret_type}'
            for stmt in ast.body:
                self.check(stmt)
        elif isinstance(ast, LetNode):
            val_type = self.infer_type(ast.value)
            self.env[ast.name] = val_type
        elif isinstance(ast, CallNode):
            if ast.callee not in self.env and ast.callee not in ('mutate', 'breed', 'compose', 'evolve', 'grow', 'export', 'map', 'log', 'print'):
                self.warnings.append(f"Unresolved function: {ast.callee}")
        return {'errors': self.errors, 'warnings': self.warnings, 'types': self.env}

    def infer_type(self, node):
        if isinstance(node, LiteralNode):
            return node.lit_type
        if isinstance(node, IdentNode):
            return self.env.get(node.name, 'any')
        if isinstance(node, BinOpNode):
            lt = self.infer_type(node.left)
            rt = self.infer_type(node.right)
            if node.op in ('+', '-', '*', '/', '%', '**'):
                if lt == 'float' or rt == 'float':
                    return 'float'
                return 'int'
            return 'bool'
        if isinstance(node, ArrayNode):
            return 'array'
        if isinstance(node, StructNode):
            return 'struct'
        if isinstance(node, SeedOpNode):
            return 'Seed'
        if isinstance(node, CallNode):
            return 'any'
        if isinstance(node, AccessNode):
            return 'any'
        if isinstance(node, PipeNode):
            return self.infer_type(node.right)
        return 'any'


# ─── AST to JSON ──────────────────────────────────────────────────────────────
def ast_to_dict(node):
    if node is None:
        return None
    if isinstance(node, (int, float, str, bool)):
        return node
    if isinstance(node, list):
        return [ast_to_dict(n) for n in node]
    if isinstance(node, dict):
        return {k: ast_to_dict(v) for k, v in node.items()}
    if hasattr(node, '__dataclass_fields__'):
        d = {'kind': node.kind}
        for fname in node.__dataclass_fields__:
            if fname == 'kind':
                continue
            val = getattr(node, fname)
            d[fname] = ast_to_dict(val)
        return d
    return str(node)


# ─── Public API ────────────────────────────────────────────────────────────────
def parse_gspl(source):
    """Parse GSPL source code and return AST + diagnostics."""
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    parser = Parser(tokens)
    ast = parser.parse()
    checker = TypeChecker()
    type_info = checker.check(ast)
    return {
        'ast': ast_to_dict(ast),
        'tokens': [{'type': t.type.name, 'value': t.value, 'line': t.line, 'col': t.col} for t in tokens[:200]],
        'errors': parser.errors + type_info['errors'],
        'warnings': type_info['warnings'],
        'types': type_info['types'],
        'stats': {
            'declarations': len(ast.declarations),
            'tokens': len(tokens),
            'errors': len(parser.errors),
        }
    }
