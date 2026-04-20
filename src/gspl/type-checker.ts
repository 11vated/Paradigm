import { Program, ASTNode, ASTNodeType, FunctionDecl, VariableDecl, Identifier, Literal, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, ArrayLiteral, ObjectLiteral, FunctionExpr, IfStatement, ForStatement, WhileStatement, ReturnStatement, Assignment, Block } from './parser';

export enum GSPLType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FUNCTION = 'function',
  SEED = 'seed',
  GENE = 'gene',
  NULL = 'null',
  UNKNOWN = 'unknown',
  VOID = 'void'
}

export interface TypeInfo {
  type: GSPLType;
  elementType?: GSPLType;
  propertyTypes?: Map<string, GSPLType>;
}

export class TypeChecker {
  private functionTypes: Map<string, TypeInfo[]> = new Map();
  private variableTypes: Map<string, TypeInfo> = new Map();
  private errors: TypeError[] = [];

  constructor() {
    this.registerBuiltinTypes();
  }

  private registerBuiltinTypes(): void {
    this.variableTypes.set('number', { type: GSPLType.NUMBER });
    this.variableTypes.set('string', { type: GSPLType.STRING });
    this.variableTypes.set('boolean', { type: GSPLType.BOOLEAN });
    this.variableTypes.set('array', { type: GSPLType.ARRAY });
    this.variableTypes.set('object', { type: GSPLType.OBJECT });
    this.variableTypes.set('function', { type: GSPLType.FUNCTION });
    this.variableTypes.set('seed', { type: GSPLType.SEED });
    this.variableTypes.set('gene', { type: GSPLType.GENE });
    this.variableTypes.set('null', { type: GSPLType.NULL });
  }

  check(program: Program): TypeError[] {
    this.errors = [];

    for (const stmt of program.body) {
      this.checkNode(stmt);
    }

    return this.errors;
  }

  private checkNode(node: ASTNode, expectedType?: GSPLType): TypeInfo | null {
    if (!node) return null;

    switch (node.type) {
      case ASTNodeType.LITERAL:
        return this.checkLiteral(node as Literal);
      case ASTNodeType.IDENTIFIER:
        return this.checkIdentifier(node as Identifier);
      case ASTNodeType.BINARY_EXPR:
        return this.checkBinaryExpr(node as BinaryExpr);
      case ASTNodeType.UNARY_EXPR:
        return this.checkUnaryExpr(node as UnaryExpr);
      case ASTNodeType.CALL_EXPR:
        return this.checkCallExpr(node as CallExpr);
      case ASTNodeType.INDEX_EXPR:
        return this.checkIndexExpr(node as IndexExpr);
      case ASTNodeType.MEMBER_EXPR:
        return this.checkMemberExpr(node as MemberExpr);
      case ASTNodeType.ARRAY_LITERAL:
        return this.checkArrayLiteral(node as ArrayLiteral);
      case ASTNodeType.OBJECT_LITERAL:
        return this.checkObjectLiteral(node as ObjectLiteral);
      case ASTNodeType.VARIABLE_DECL:
        return this.checkVariableDecl(node as VariableDecl);
      case ASTNodeType.ASSIGNMENT:
        return this.checkAssignment(node as Assignment, expectedType);
      case ASTNodeType.FUNCTION_DECL:
        return this.checkFunctionDecl(node as FunctionDecl);
      case ASTNodeType.IF_STATEMENT:
        return this.checkIfStatement(node as IfStatement, expectedType);
      case ASTNodeType.FOR_STATEMENT:
        return this.checkForStatement(node as ForStatement, expectedType);
      case ASTNodeType.WHILE_STATEMENT:
        return this.checkWhileStatement(node as WhileStatement, expectedType);
      case ASTNodeType.RETURN_STATEMENT:
        return this.checkReturnStatement(node as ReturnStatement, expectedType);
      case ASTNodeType.BLOCK:
        return this.checkBlock(node as Block, expectedType);
      default:
        return { type: GSPLType.UNKNOWN };
    }
  }

  private checkLiteral(node: Literal): TypeInfo {
    const value = node.value;
    if (typeof value === 'number') return { type: GSPLType.NUMBER };
    if (typeof value === 'string') return { type: GSPLType.STRING };
    if (typeof value === 'boolean') return { type: GSPLType.BOOLEAN };
    if (value === null) return { type: GSPLType.NULL };
    return { type: GSPLType.UNKNOWN };
  }

  private checkIdentifier(node: Identifier): TypeInfo {
    if (this.variableTypes.has(node.name)) {
      return this.variableTypes.get(node.name)!;
    }
    this.errors.push({
      message: `Undefined variable: ${node.name}`,
      line: node.line,
      column: node.column
    });
    return { type: GSPLType.UNKNOWN };
  }

  private checkBinaryExpr(node: BinaryExpr): TypeInfo {
    const left = this.checkNode(node.left);
    const right = this.checkNode(node.right);

    switch (node.operator) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
      case '**':
        if (left?.type !== GSPLType.NUMBER || right?.type !== GSPLType.NUMBER) {
          this.errors.push({
            message: `Operator '${node.operator}' requires numeric operands`,
            line: node.line,
            column: node.column
          });
        }
        return { type: GSPLType.NUMBER };

      case '==':
      case '!=':
        return { type: GSPLType.BOOLEAN };

      case '<':
      case '<=':
      case '>':
      case '>=':
        if (left?.type !== GSPLType.NUMBER || right?.type !== GSPLType.NUMBER) {
          this.errors.push({
            message: `Comparison requires numeric operands`,
            line: node.line,
            column: node.column
          });
        }
        return { type: GSPLType.BOOLEAN };

      case '&&':
      case '||':
        if (left?.type !== GSPLType.BOOLEAN || right?.type !== GSPLType.BOOLEAN) {
          this.errors.push({
            message: `Logical operator '${node.operator}' requires boolean operands`,
            line: node.line,
            column: node.column
          });
        }
        return { type: GSPLType.BOOLEAN };

      default:
        return { type: GSPLType.UNKNOWN };
    }
  }

  private checkUnaryExpr(node: UnaryExpr): TypeInfo {
    const operand = this.checkNode(node.operand);

    switch (node.operator) {
      case '!':
        if (operand?.type !== GSPLType.BOOLEAN) {
          this.errors.push({
            message: `Operator '!' requires boolean operand`,
            line: node.line,
            column: node.column
          });
        }
        return { type: GSPLType.BOOLEAN };

      case '-':
        if (operand?.type !== GSPLType.NUMBER) {
          this.errors.push({
            message: `Operator '-' requires numeric operand`,
            line: node.line,
            column: node.column
          });
        }
        return { type: GSPLType.NUMBER };

      default:
        return { type: GSPLType.UNKNOWN };
    }
  }

  private checkCallExpr(node: CallExpr): TypeInfo {
    const callee = this.checkNode(node.callee);
    if (callee?.type !== GSPLType.FUNCTION) {
      this.errors.push({
        message: `Cannot call non-function value`,
        line: node.line,
        column: node.column
      });
    }
    return { type: GSPLType.UNKNOWN };
  }

  private checkIndexExpr(node: IndexExpr): TypeInfo {
    const obj = this.checkNode(node.object);
    const idx = this.checkNode(node.index);

    if (obj?.type === GSPLType.ARRAY) {
      return { type: obj.elementType ?? GSPLType.UNKNOWN };
    }
    if (obj?.type === GSPLType.OBJECT && obj.propertyTypes) {
      const index = (node.index as Literal)?.value;
      if (typeof index === 'string' && obj.propertyTypes.has(index)) {
        return { type: obj.propertyTypes.get(index)! };
      }
    }
    return { type: GSPLType.UNKNOWN };
  }

  private checkMemberExpr(node: MemberExpr): TypeInfo {
    const obj = this.checkNode(node.object);
    if (obj?.type === GSPLType.OBJECT && obj.propertyTypes?.has(node.property)) {
      return { type: obj.propertyTypes.get(node.property)! };
    }
    return { type: GSPLType.UNKNOWN };
  }

  private checkArrayLiteral(node: ArrayLiteral): TypeInfo {
    const elementType = node.elements.length > 0 ? this.checkNode(node.elements[0]) : { type: GSPLType.UNKNOWN };
    return { type: GSPLType.ARRAY, elementType: elementType?.type };
  }

  private checkObjectLiteral(node: ObjectLiteral): TypeInfo {
    const propertyTypes = new Map<string, GSPLType>();
    for (const [key, val] of node.properties) {
      const typeInfo = this.checkNode(val);
      if (typeInfo) propertyTypes.set(key, typeInfo.type);
    }
    return { type: GSPLType.OBJECT, propertyTypes };
  }

  private checkVariableDecl(node: VariableDecl): TypeInfo {
    const initType = this.checkNode(node.initializer);
    if (initType) {
      this.variableTypes.set(node.name, initType);
    }
    return initType ?? { type: GSPLType.UNKNOWN };
  }

  private checkAssignment(node: Assignment, expected?: GSPLType): TypeInfo {
    const targetType = this.checkNode(node.target);
    const valueType = this.checkNode(node.value);

    if (targetType && valueType && targetType.type !== valueType.type && valueType.type !== GSPLType.UNKNOWN) {
      this.errors.push({
        message: `Type mismatch: expected ${targetType.type}, got ${valueType.type}`,
        line: node.line,
        column: node.column
      });
    }

    return valueType ?? { type: GSPLType.UNKNOWN };
  }

  private checkFunctionDecl(node: FunctionDecl): TypeInfo {
    const paramTypes: TypeInfo[] = node.params.map(() => ({ type: GSPLType.UNKNOWN }));
    this.functionTypes.set(node.name, paramTypes);
    this.checkNode(node.body);
    return { type: GSPLType.FUNCTION };
  }

  private checkIfStatement(node: IfStatement, expected?: GSPLType): TypeInfo | null {
    const condType = this.checkNode(node.condition);
    if (condType?.type !== GSPLType.BOOLEAN) {
      this.errors.push({
        message: `Condition must be boolean`,
        line: node.line,
        column: node.column
      });
    }

    this.checkNode(node.thenBranch, expected);
    if (node.elseBranch) {
      this.checkNode(node.elseBranch, expected);
    }
    return null;
  }

  private checkForStatement(node: ForStatement, expected?: GSPLType): TypeInfo | null {
    if (node.initializer) this.checkNode(node.initializer);
    this.checkNode(node.condition);
    this.checkNode(node.increment);
    this.checkNode(node.body, expected);
    return null;
  }

  private checkWhileStatement(node: WhileStatement, expected?: GSPLType): TypeInfo | null {
    const condType = this.checkNode(node.condition);
    if (condType?.type !== GSPLType.BOOLEAN) {
      this.errors.push({
        message: `Condition must be boolean`,
        line: node.line,
        column: node.column
      });
    }
    this.checkNode(node.body, expected);
    return null;
  }

  private checkReturnStatement(node: ReturnStatement, expected?: GSPLType): TypeInfo | null {
    if (node.value) {
      const valueType = this.checkNode(node.value);
      if (expected && valueType?.type !== expected && valueType?.type !== GSPLType.UNKNOWN) {
        this.errors.push({
          message: `Return type mismatch: expected ${expected}, got ${valueType.type}`,
          line: node.line,
          column: node.column
        });
      }
      return valueType ?? null;
    }
    return { type: GSPLType.VOID };
  }

  private checkBlock(node: Block, expected?: GSPLType): TypeInfo | null {
    let resultType: TypeInfo | null = null;

    for (const stmt of node.statements) {
      resultType = this.checkNode(stmt, expected);
    }

    return resultType;
  }
}

export interface TypeError {
  message: string;
  line: number;
  column: number;
}